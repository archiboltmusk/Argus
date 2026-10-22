use realfft::num_complex::Complex;
use realfft::RealFftPlanner;

pub const GRID_HZ: f32 = 100.0;
const MAX_LAG_SEC: f32 = 60.0;
const Z_MIN: f32 = 6.0;
const DOMINANCE_MIN: f32 = 1.3;

pub struct SyncResult {
    pub offset_sec: f32,
    pub ratio: f32,
    pub confidence: f32,
}

fn ratios() -> Vec<f32> {
    let base = [1.0f32, 1.25, 0.8, 1.0427, 1.00092, 1.04167];
    let mut v: Vec<f32> = Vec::new();
    for &r in base.iter() {
        if !v.iter().any(|x| (x - r).abs() < 1e-5) {
            v.push(r);
        }
        let inv = 1.0 / r;
        if (inv - 1.0).abs() > 1e-4 && !v.iter().any(|x| (x - inv).abs() < 1e-5) {
            v.push(inv);
        }
    }
    v
}

fn rasterize(intervals: &[(f32, f32)], scale: f32, len: usize) -> Vec<f32> {
    let mut m = vec![0f32; len];
    for &(a, b) in intervals {
        let s = ((a * scale * GRID_HZ).round().max(0.0)) as usize;
        let e = ((b * scale * GRID_HZ).round().max(0.0)) as usize;
        for x in m.iter_mut().take(e.min(len)).skip(s.min(len)) {
            *x = 1.0;
        }
    }
    m
}

fn fft_xcorr(a: &[f32], b: &[f32], max_lag: usize) -> Vec<f32> {
    let n = a.len().max(b.len());
    let m = (n + max_lag + 1).next_power_of_two();
    let mut planner = RealFftPlanner::<f32>::new();
    let fwd = planner.plan_fft_forward(m);
    let inv = planner.plan_fft_inverse(m);
    let mut abuf = fwd.make_input_vec();
    let mut bbuf = fwd.make_input_vec();
    abuf[..a.len()].copy_from_slice(a);
    bbuf[..b.len()].copy_from_slice(b);
    let mut aspec = fwd.make_output_vec();
    let mut bspec = fwd.make_output_vec();
    if fwd.process(&mut abuf, &mut aspec).is_err() || fwd.process(&mut bbuf, &mut bspec).is_err() {
        return vec![0f32; 2 * max_lag + 1];
    }
    let mut prod: Vec<Complex<f32>> = aspec
        .iter()
        .zip(bspec.iter())
        .map(|(&x, &y)| x * y.conj())
        .collect();
    let mut out = inv.make_output_vec();
    if inv.process(&mut prod, &mut out).is_err() {
        return vec![0f32; 2 * max_lag + 1];
    }
    let norm = m as f32;
    let mut res = vec![0f32; 2 * max_lag + 1];
    for l in 0..=max_lag {
        res[max_lag + l] = out[l] / norm;
        if l > 0 {
            res[max_lag - l] = out[m - l] / norm;
        }
    }
    res
}

fn peak_stats(corr: &[f32]) -> (usize, f32, f32) {
    let n = corr.len();
    let mut peak = f32::MIN;
    let mut pidx = 0;
    for (i, &v) in corr.iter().enumerate() {
        if v > peak {
            peak = v;
            pidx = i;
        }
    }
    let mean = corr.iter().sum::<f32>() / n as f32;
    let var = corr.iter().map(|&v| (v - mean).powi(2)).sum::<f32>() / n as f32;
    let std = var.sqrt().max(1e-9);
    let z = (peak - mean) / std;
    let guard = GRID_HZ as usize;
    let mut second = f32::MIN;
    for (i, &v) in corr.iter().enumerate() {
        let far = (i + guard) < pidx || i > (pidx + guard);
        if far && v > second {
            second = v;
        }
    }
    let dominance = if second > 1e-6 {
        peak / second
    } else {
        f32::INFINITY
    };
    (pidx, z, dominance)
}

fn ncc_at(a: &[f32], b: &[f32], lag: isize) -> f32 {
    let (mut sx, mut sy, mut cnt) = (0.0f32, 0.0f32, 0.0f32);
    for (i, &x) in a.iter().enumerate() {
        let j = i as isize - lag;
        if j < 0 || j as usize >= b.len() {
            continue;
        }
        sx += x;
        sy += b[j as usize];
        cnt += 1.0;
    }
    if cnt < 1.0 {
        return 0.0;
    }
    let (mx, my) = (sx / cnt, sy / cnt);
    let (mut xy, mut xx, mut yy) = (0.0f32, 0.0f32, 0.0f32);
    for (i, &x) in a.iter().enumerate() {
        let j = i as isize - lag;
        if j < 0 || j as usize >= b.len() {
            continue;
        }
        let dx = x - mx;
        let dy = b[j as usize] - my;
        xy += dx * dy;
        xx += dx * dx;
        yy += dy * dy;
    }
    let denom = (xx * yy).sqrt();
    if denom < 1e-9 {
        0.0
    } else {
        xy / denom
    }
}

/// Residual offset (seconds) still present around `t` after the global transform.
pub struct Anchor {
    pub t: f32,
    pub offset_sec: f32,
}

const CHUNK_SEC: f32 = 240.0;
const LOCAL_MAX_LAG_SEC: f32 = 12.0;
const LOCAL_NCC_MIN: f32 = 0.45;
const LOCAL_Z_MIN: f32 = 4.0;
const LOCAL_MIN_CUES: usize = 6;

fn rasterize_range(intervals: &[(f32, f32)], t0: f32, len: usize) -> Vec<f32> {
    let mut m = vec![0f32; len];
    for &(a, b) in intervals {
        let s = (((a - t0) * GRID_HZ).round().max(0.0)) as usize;
        let e = (((b - t0) * GRID_HZ).round().max(0.0)) as usize;
        for x in m.iter_mut().take(e.min(len)).skip(s.min(len)) {
            *x = 1.0;
        }
    }
    m
}

/// Refines a global fit with per-chunk residual offsets so cuts and edits that
/// shift only part of the film (or drift that is not linear) still line up.
/// `cues` are the original cue times; `ratio`/`offset_sec` the global fit.
pub fn local_anchors(
    audio: &[(f32, f32)],
    cues: &[(f32, f32)],
    ratio: f32,
    offset_sec: f32,
    total_sec: f32,
) -> Vec<Anchor> {
    local_anchors_chunked(audio, cues, ratio, offset_sec, total_sec, CHUNK_SEC)
}

fn local_anchors_chunked(
    audio: &[(f32, f32)],
    cues: &[(f32, f32)],
    ratio: f32,
    offset_sec: f32,
    total_sec: f32,
    chunk_sec: f32,
) -> Vec<Anchor> {
    let fitted: Vec<(f32, f32)> = cues
        .iter()
        .map(|&(a, b)| (a * ratio + offset_sec, b * ratio + offset_sec))
        .collect();
    let max_lag = (LOCAL_MAX_LAG_SEC * GRID_HZ) as usize;
    let mut out = Vec::new();
    let mut cs = 0.0f32;
    while cs < total_sec {
        let ce = (cs + chunk_sec).min(total_sec);
        let len = (((ce - cs) * GRID_HZ).round() as usize).max(1);
        let in_chunk = |iv: &&(f32, f32)| iv.1 > cs && iv.0 < ce;
        let a_iv: Vec<(f32, f32)> = audio.iter().filter(in_chunk).copied().collect();
        let c_iv: Vec<(f32, f32)> = fitted.iter().filter(in_chunk).copied().collect();
        let mid = (cs + ce) / 2.0;
        let start = cs;
        cs = ce;
        if c_iv.len() < LOCAL_MIN_CUES || a_iv.is_empty() {
            continue;
        }
        let amask = rasterize_range(&a_iv, start, len);
        let bmask = rasterize_range(&c_iv, start, len);
        let corr = fft_xcorr(&amask, &bmask, max_lag);
        let (pidx, z, _dom) = peak_stats(&corr);
        let lag = pidx as isize - max_lag as isize;
        let ncc = ncc_at(&amask, &bmask, lag);
        if ncc >= LOCAL_NCC_MIN && z >= LOCAL_Z_MIN {
            out.push(Anchor {
                t: mid,
                offset_sec: lag as f32 / GRID_HZ,
            });
        }
    }
    out
}

pub fn solve(
    audio: &[(f32, f32)],
    cues: &[(f32, f32)],
    total_sec: f32,
    conf_min: f32,
) -> Option<SyncResult> {
    let len = ((total_sec * GRID_HZ).round() as usize).max(1);
    if cues.is_empty() || audio.is_empty() || len < 2 {
        return None;
    }
    let amask = rasterize(audio, 1.0, len);
    let max_lag = (MAX_LAG_SEC * GRID_HZ) as usize;
    let mut best: Option<(f32, isize, f32, f32, f32)> = None;
    for r in ratios() {
        let bmask = rasterize(cues, r, len);
        let corr = fft_xcorr(&amask, &bmask, max_lag);
        let (pidx, z, dom) = peak_stats(&corr);
        let lag = pidx as isize - max_lag as isize;
        let ncc = ncc_at(&amask, &bmask, lag);
        if best.map(|(_, _, c, _, _)| ncc > c).unwrap_or(true) {
            best = Some((r, lag, ncc, z, dom));
        }
    }
    let (ratio, lag, ncc, z, dom) = best?;
    let offset_sec = lag as f32 / GRID_HZ;
    eprintln!(
        "[subsync] best ratio={:.4} offset={:.2}s ncc={:.3} z={:.1} dom={:.2} (min ncc={:.2} z={:.1} dom={:.1})",
        ratio, offset_sec, ncc, z, dom, conf_min, Z_MIN, DOMINANCE_MIN
    );
    if ncc < conf_min || z < Z_MIN || dom < DOMINANCE_MIN || offset_sec.abs() > MAX_LAG_SEC {
        return None;
    }
    Some(SyncResult {
        offset_sec,
        ratio,
        confidence: ncc,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cue_pattern() -> Vec<(f32, f32)> {
        let gaps = [
            4.3f32, 6.1, 3.2, 7.4, 5.0, 3.9, 8.2, 4.7, 6.6, 3.5, 5.8, 7.1,
        ];
        let mut t = 5.0f32;
        let mut cues = Vec::new();
        for k in 0..26 {
            let dur = 1.0 + (k % 4) as f32 * 0.3;
            cues.push((t, t + dur));
            t += dur + gaps[k % gaps.len()];
        }
        cues
    }

    #[test]
    fn recovers_flat_offset() {
        let cues = cue_pattern();
        let audio: Vec<(f32, f32)> = cues.iter().map(|&(a, b)| (a + 7.3, b + 7.3)).collect();
        let r = solve(&audio, &cues, 260.0, 0.55).expect("should sync");
        assert!((r.offset_sec - 7.3).abs() < 0.05, "offset {}", r.offset_sec);
        assert!((r.ratio - 1.0).abs() < 1e-4, "ratio {}", r.ratio);
    }

    #[test]
    fn recovers_fps_drift() {
        let cues = cue_pattern();
        let audio: Vec<(f32, f32)> = cues.iter().map(|&(a, b)| (a * 1.25, b * 1.25)).collect();
        let r = solve(&audio, &cues, 340.0, 0.55).expect("should sync drift");
        assert!((r.ratio - 1.25).abs() < 1e-3, "ratio {}", r.ratio);
    }

    #[test]
    fn local_anchors_find_mid_film_cut() {
        let cues = cue_pattern();
        let audio: Vec<(f32, f32)> = cues
            .iter()
            .map(|&(a, b)| {
                if a < 120.0 {
                    (a + 2.0, b + 2.0)
                } else {
                    (a + 5.0, b + 5.0)
                }
            })
            .collect();
        let anchors = local_anchors_chunked(&audio, &cues, 1.0, 2.0, 180.0, 90.0);
        assert_eq!(
            anchors.len(),
            2,
            "{:?}",
            anchors
                .iter()
                .map(|a| (a.t, a.offset_sec))
                .collect::<Vec<_>>()
        );
        assert!(
            anchors[0].offset_sec.abs() < 0.2,
            "first {}",
            anchors[0].offset_sec
        );
        assert!(
            (anchors[1].offset_sec - 3.0).abs() < 0.2,
            "second {}",
            anchors[1].offset_sec
        );
    }

    #[test]
    fn declines_on_no_structure() {
        let cues = cue_pattern();
        let audio = vec![(0.0f32, 260.0f32)];
        assert!(solve(&audio, &cues, 260.0, 0.55).is_none());
    }
}
