use super::*;
use std::io::Cursor;

struct Scratch(PathBuf);
impl Scratch {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("video-archive-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        Self(root)
    }
    fn file(&self, name: &str) -> PathBuf {
        self.0.join(name)
    }
    fn cache(&self) -> PathBuf {
        self.0.join("cache")
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn movie() -> Vec<u8> {
    (0..300_000u32)
        .map(|n| (n.wrapping_mul(31) >> 3) as u8)
        .collect()
}
const SAMPLE: &[u8] = b"short sample clip";
const NOTES: &[u8] = b"release notes";

fn assert_extracted(result: Result<Extracted>) {
    let video = result.expect("extraction");
    assert_eq!(video.name, "Show.S01E01.1080p.mkv");
    assert_eq!(video.bytes, movie().len() as u64);
    assert_eq!(fs::read(&video.path).unwrap(), movie());
}

fn zip_archive(scratch: &Scratch, method: zip::CompressionMethod) -> PathBuf {
    use zip::write::SimpleFileOptions;
    let path = scratch.file("release.zip");
    let mut writer = zip::ZipWriter::new(File::create(&path).unwrap());
    let options = SimpleFileOptions::default().compression_method(method);
    for (name, bytes) in [
        ("Show/Sample/sample.mkv", SAMPLE.to_vec()),
        ("Show/Show.S01E01.1080p.mkv", movie()),
        ("Show/notes.txt", NOTES.to_vec()),
    ] {
        writer.start_file(name, options).unwrap();
        writer.write_all(&bytes).unwrap();
    }
    writer.finish().unwrap();
    path
}

#[test]
fn zip_stored_and_deflated_yield_the_main_video() {
    for method in [
        zip::CompressionMethod::Stored,
        zip::CompressionMethod::Deflated,
    ] {
        let scratch = Scratch::new();
        let path = zip_archive(&scratch, method);
        assert_extracted(extract_video(&path, &scratch.cache()));
    }
}

#[test]
fn second_extraction_reuses_the_cached_file() {
    let scratch = Scratch::new();
    let path = zip_archive(&scratch, zip::CompressionMethod::Stored);
    let first = extract_video(&path, &scratch.cache()).unwrap();
    let modified = fs::metadata(&first.path).unwrap().modified().unwrap();
    let second = extract_video(&path, &scratch.cache()).unwrap();
    assert_eq!(first.path, second.path);
    assert_eq!(
        fs::metadata(&second.path).unwrap().modified().unwrap(),
        modified
    );
}

#[test]
fn archive_without_a_video_is_reported() {
    use zip::write::SimpleFileOptions;
    let scratch = Scratch::new();
    let path = scratch.file("docs.zip");
    let mut writer = zip::ZipWriter::new(File::create(&path).unwrap());
    writer
        .start_file("readme.txt", SimpleFileOptions::default())
        .unwrap();
    writer.write_all(NOTES).unwrap();
    writer.finish().unwrap();
    assert_eq!(
        extract_video(&path, &scratch.cache()).err(),
        Some("archive_no_video")
    );
}

#[test]
fn unknown_extension_is_not_an_archive() {
    let scratch = Scratch::new();
    let path = scratch.file("movie.mkv");
    fs::write(&path, b"x").unwrap();
    assert!(!is_supported_archive(&path));
    assert_eq!(
        extract_video(&path, &scratch.cache()).err(),
        Some("archive_format")
    );
}

fn tar_bytes() -> Vec<u8> {
    let mut builder = tar::Builder::new(Vec::new());
    for (name, bytes) in [
        ("Show/Sample/sample.mkv", SAMPLE.to_vec()),
        ("Show/Show.S01E01.1080p.mkv", movie()),
        ("Show/notes.txt", NOTES.to_vec()),
    ] {
        let mut header = tar::Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o644);
        header.set_cksum();
        builder
            .append_data(&mut header, name, Cursor::new(bytes))
            .unwrap();
    }
    builder.into_inner().unwrap()
}

#[test]
fn tar_and_tar_gz_yield_the_main_video() {
    let scratch = Scratch::new();
    let plain = scratch.file("release.tar");
    fs::write(&plain, tar_bytes()).unwrap();
    assert_extracted(extract_video(&plain, &scratch.cache()));

    let zipped = scratch.file("release.tar.gz");
    let mut encoder =
        flate2::write::GzEncoder::new(File::create(&zipped).unwrap(), flate2::Compression::fast());
    encoder.write_all(&tar_bytes()).unwrap();
    encoder.finish().unwrap();
    assert_extracted(extract_video(&zipped, &scratch.cache()));
}

#[test]
fn seven_zip_solid_and_non_solid_yield_the_main_video() {
    use sevenz_rust2::{ArchiveEntry, ArchiveWriter, SourceReader};
    for solid in [false, true] {
        let scratch = Scratch::new();
        let path = scratch.file("release.7z");
        let mut writer = ArchiveWriter::create(&path).unwrap();
        let items = [
            ("Show/Sample/sample.mkv", SAMPLE.to_vec()),
            ("Show/Show.S01E01.1080p.mkv", movie()),
            ("Show/notes.txt", NOTES.to_vec()),
        ];
        if solid {
            let entries = items
                .iter()
                .map(|(name, _)| ArchiveEntry::new_file(name))
                .collect();
            let data = items
                .iter()
                .map(|(_, bytes)| SourceReader::new(Cursor::new(bytes.clone())))
                .collect();
            writer.push_archive_entries(entries, data).unwrap();
        } else {
            for (name, bytes) in items {
                writer
                    .push_archive_entry(ArchiveEntry::new_file(name), Some(Cursor::new(bytes)))
                    .unwrap();
            }
        }
        writer.finish().unwrap();
        assert_extracted(extract_video(&path, &scratch.cache()));
    }
}

fn vint(mut value: u64) -> Vec<u8> {
    let mut out = Vec::new();
    loop {
        let low = (value & 0x7f) as u8;
        value >>= 7;
        if value == 0 {
            out.push(low);
            return out;
        }
        out.push(low | 0x80);
    }
}

/// One RAR5 block: CRC over everything after the CRC field, size field first.
fn rar5_block(body: &[u8]) -> Vec<u8> {
    let mut covered = vint(body.len() as u64);
    covered.extend_from_slice(body);
    let mut out = crc32fast::hash(&covered).to_le_bytes().to_vec();
    out.extend(covered);
    out
}

/// A RAR5 archive whose files are stored without compression.
fn rar5(files: &[(&str, &[u8])], corrupt_crc: bool) -> Vec<u8> {
    let mut out = b"Rar!\x1a\x07\x01\x00".to_vec();
    out.extend(rar5_block(&[1, 0, 0]));
    for (name, data) in files {
        let mut body = vint(2); // file header
        body.extend(vint(0x0002)); // data area follows
        body.extend(vint(data.len() as u64)); // packed size
        body.extend(vint(0x0004)); // file flags: CRC32 present
        body.extend(vint(data.len() as u64)); // unpacked size
        body.extend(vint(0)); // attributes
        let crc = crc32fast::hash(data) ^ u32::from(corrupt_crc);
        body.extend(crc.to_le_bytes());
        body.extend(vint(0)); // compression: version 0, stored
        body.extend(vint(1)); // host OS: unix
        body.extend(vint(name.len() as u64));
        body.extend(name.as_bytes());
        out.extend(rar5_block(&body));
        out.extend_from_slice(data);
    }
    out.extend(rar5_block(&[5, 0, 0]));
    out
}

fn rar_items() -> Vec<(&'static str, Vec<u8>)> {
    vec![
        ("Show/Sample/sample.mkv", SAMPLE.to_vec()),
        ("Show/Show.S01E01.1080p.mkv", movie()),
        ("Show/notes.txt", NOTES.to_vec()),
    ]
}

#[test]
fn rar_yields_the_main_video() {
    let scratch = Scratch::new();
    let items = rar_items();
    let refs: Vec<(&str, &[u8])> = items.iter().map(|(n, d)| (*n, d.as_slice())).collect();
    let path = scratch.file("release.rar");
    fs::write(&path, rar5(&refs, false)).unwrap();
    assert_extracted(extract_video(&path, &scratch.cache()));
}

#[test]
fn rar_with_a_bad_checksum_leaves_no_file_behind() {
    let scratch = Scratch::new();
    let items = rar_items();
    let refs: Vec<(&str, &[u8])> = items.iter().map(|(n, d)| (*n, d.as_slice())).collect();
    let path = scratch.file("broken.rar");
    fs::write(&path, rar5(&refs, true)).unwrap();
    assert_eq!(
        extract_video(&path, &scratch.cache()).err(),
        Some("archive_checksum")
    );
    let leftovers: Vec<_> = fs::read_dir(scratch.cache())
        .into_iter()
        .flatten()
        .flatten()
        .flat_map(|dir| fs::read_dir(dir.path()).into_iter().flatten().flatten())
        .collect();
    assert!(leftovers.is_empty(), "left {leftovers:?}");
}

#[test]
fn names_cannot_escape_the_cache_folder() {
    assert_eq!(cache_file_name("../../etc/passwd.mkv"), "passwd.mkv");
    assert_eq!(cache_file_name("C:\\Users\\x\\movie.mkv"), "movie.mkv");
    assert_eq!(cache_file_name("a<b>c.mkv"), "a_b_c.mkv");
    assert_eq!(cache_file_name(".."), "video");
}

#[test]
fn samples_lose_to_the_real_file_but_win_when_alone() {
    let candidate = |index: usize, name: &str, bytes: u64| Candidate {
        index,
        name: name.into(),
        bytes,
    };
    let both = pick([
        candidate(0, "x/Sample.mkv", 900),
        candidate(1, "x/Movie.mkv", 100),
    ])
    .unwrap();
    assert_eq!(both.index, 1);
    let alone = pick([candidate(0, "x/sample.mkv", 100)]).unwrap();
    assert_eq!(alone.index, 0);
}

#[test]
fn prune_removes_only_old_folders() {
    let scratch = Scratch::new();
    let cache = scratch.cache();
    fs::create_dir_all(cache.join("fresh")).unwrap();
    assert_eq!(prune_cache(&cache, std::time::Duration::from_secs(3600)), 0);
    assert!(cache.join("fresh").exists());
    assert_eq!(prune_cache(&cache, std::time::Duration::ZERO), 1);
    assert!(!cache.join("fresh").exists());
}
