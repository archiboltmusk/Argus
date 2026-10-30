use std::path::PathBuf;
use tauri::Manager;

struct Pack {
    id: &'static str,
    bases: &'static [&'static str],
    files: &'static [(&'static str, &'static str)],
}

const PACKS: &[Pack] = &[
    Pack {
        id: "fsrcnnx",
        bases: &["https://github.com/igv/FSRCNN-TensorFlow/releases/download/1.1"],
        files: &[
            ("FSRCNNX_x2_16-0-4-1.glsl", "FSRCNNX_x2_16-0-4-1.glsl"),
            ("FSRCNNX_x2_8-0-4-1.glsl", "FSRCNNX_x2_8-0-4-1.glsl"),
        ],
    },
    Pack {
        id: "fsr",
        bases: &["https://gist.githubusercontent.com/agyild/82219c545228d70c5604f865ce0b0ce5/raw"],
        files: &[("FSR.glsl", "FSR.glsl")],
    },
    Pack {
        id: "cas",
        bases: &["https://gist.githubusercontent.com/agyild/bbb4e58298b2f86aa24da3032a0d2ee6/raw"],
        files: &[("CAS.glsl", "CAS.glsl"), ("CAS-scaled.glsl", "CAS-scaled.glsl")],
    },
    Pack {
        id: "nis",
        bases: &["https://gist.githubusercontent.com/agyild/7e8951915b2bf24526a9343d951db214/raw"],
        files: &[("NVScaler.glsl", "NVScaler.glsl"), ("NVSharpen.glsl", "NVSharpen.glsl")],
    },
    Pack {
        id: "sgsr",
        bases: &["https://gist.githubusercontent.com/agyild/7715b6b1f38427839d58f80884902cab/raw"],
        files: &[("SGSR.glsl", "SGSR.glsl")],
    },
    Pack {
        id: "krig",
        bases: &["https://gist.githubusercontent.com/igv/a015fc885d5c22e6891820ad89555637/raw"],
        files: &[("KrigBilateral.glsl", "KrigBilateral.glsl")],
    },
    Pack {
        id: "ssimsuperres",
        bases: &["https://gist.githubusercontent.com/igv/2364ffa6e81540f29cb7ab4c9bc05b6b/raw"],
        files: &[("SSimSuperRes.glsl", "SSimSuperRes.glsl")],
    },
    Pack {
        id: "adaptive-sharpen",
        bases: &["https://gist.githubusercontent.com/igv/8a77e4eb8276753b54bb94c1c50c317e/raw"],
        files: &[("adaptive-sharpen.glsl", "adaptive-sharpen.glsl")],
    },
    Pack {
        id: "ravu",
        bases: &["https://raw.githubusercontent.com/bjin/mpv-prescalers/master"],
        files: &[
            ("ravu-lite-r3.hook", "ravu-lite-r3.hook"),
            ("ravu-lite-r4.hook", "ravu-lite-r4.hook"),
            ("ravu-lite-r2.hook", "ravu-lite-r2.hook"),
        ],
    },
    Pack {
        id: "nnedi3",
        bases: &["https://raw.githubusercontent.com/bjin/mpv-prescalers/master"],
        files: &[
            ("nnedi3-nns32-win8x4.hook", "nnedi3-nns32-win8x4.hook"),
            ("nnedi3-nns64-win8x4.hook", "nnedi3-nns64-win8x4.hook"),
            ("nnedi3-nns128-win8x4.hook", "nnedi3-nns128-win8x4.hook"),
        ],
    },
    Pack {
        id: "hdr-toys",
        bases: &["https://raw.githubusercontent.com/natural-harmonia-gropius/hdr-toys/master/shaders/hdr-toys"],
        files: &[
            ("utils/clip_both.glsl", "clip_both.glsl"),
            ("transfer-function/pq_inv.glsl", "pq_inv.glsl"),
            ("transfer-function/hlg_inv.glsl", "hlg_inv.glsl"),
            ("transfer-function/bt1886.glsl", "bt1886.glsl"),
            ("tone-mapping/astra.glsl", "astra.glsl"),
            ("gamut-mapping/bottosson.glsl", "bottosson.glsl"),
        ],
    },
    Pack {
        id: "vintage-cinema-ray",
        bases: &["https://raw.githubusercontent.com/archiboltmusk/Argus/main/public/shaders"],
        files: &[("vintage-cinema.glsl", "vintage-cinema.glsl")],
    },
];

const VINTAGE_CINEMA_GLSL: &str = r#"//!HOOK MAIN
//!BIND HOOKED
//!DESC Satyajit Ray 35mm Silver Gelatin & Vintage Film Restoration Shader

vec4 hook() {
    vec4 color = HOOKED_tex(HOOKED_pos);

    // 1. Reconstruct 35mm silver gelatin film density
    // Darkens deep shadows and preserves highlight roll-off (Subrata Mitra bounce-lighting)
    float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float contrast_luma = smoothstep(0.04, 0.96, luma);

    // 2. Micro-contour sharpening & edge definition (unsharp mask without digital halos)
    vec2 texcoord = HOOKED_pos;
    vec2 px = HOOKED_pt;
    vec3 c_up = HOOKED_tex(texcoord + vec2(0.0, -px.y)).rgb;
    vec3 c_down = HOOKED_tex(texcoord + vec2(0.0, px.y)).rgb;
    vec3 c_left = HOOKED_tex(texcoord + vec2(-px.x, 0.0)).rgb;
    vec3 c_right = HOOKED_tex(texcoord + vec2(px.x, 0.0)).rgb;
    vec3 blur = (c_up + c_down + c_left + c_right) * 0.25;
    vec3 edge = color.rgb - blur;

    // Apply subtle edge lift (+15%)
    vec3 sharpened = color.rgb + edge * 0.15;

    // 3. Subtle organic 35mm film grain texture to break up digital banding on DVD transfers
    float grain = fract(sin(dot(texcoord, vec2(12.9898, 78.233))) * 43758.5453);
    float grain_intensity = 0.015 * (1.0 - abs(luma - 0.5) * 2.0);

    vec3 result = mix(color.rgb, sharpened, 0.6) + vec3((grain - 0.5) * grain_intensity);

    return vec4(max(vec3(0.0), result), color.a);
}
"#;

fn find_pack(id: &str) -> Option<&'static Pack> {
    PACKS.iter().find(|p| p.id == id)
}

fn pack_dir(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("shaders").join(id))
}

#[tauri::command]
pub fn shader_dir(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    let pack = match find_pack(&id) {
        Some(p) => p,
        None => return Ok(None),
    };
    let dir = pack_dir(&app, &id)?;
    let marker = dir.join(pack.files[0].1);
    if marker.exists() {
        Ok(Some(dir.to_string_lossy().into_owned()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn shader_download(
    app: tauri::AppHandle,
    id: String,
    force: bool,
) -> Result<String, String> {
    let pack = find_pack(&id).ok_or_else(|| format!("unknown shader pack: {}", id))?;
    let dir = pack_dir(&app, &id)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create dir: {}", e))?;

    // Self-contained offline fallback for custom vintage cinema shader pack
    if id == "vintage-cinema-ray" {
        let dest = dir.join("vintage-cinema.glsl");
        std::fs::write(&dest, VINTAGE_CINEMA_GLSL.as_bytes())
            .map_err(|e| format!("write vintage-cinema.glsl: {}", e))?;
        return Ok(dir.to_string_lossy().into_owned());
    }

    let client = reqwest::Client::builder()
        .user_agent("Argus")
        .build()
        .map_err(|e| e.to_string())?;
    for (remote, local) in pack.files {
        let dest = dir.join(local);
        if !force {
            if let Ok(meta) = std::fs::metadata(&dest) {
                if meta.len() > 0 {
                    continue;
                }
            }
        }
        let mut last_err = String::new();
        let mut wrote = false;
        for base in pack.bases {
            let url = format!("{}/{}", base, remote);
            let resp = match client.get(&url).send().await {
                Ok(r) => r,
                Err(e) => {
                    last_err = format!("{}", e);
                    continue;
                }
            };
            if !resp.status().is_success() {
                last_err = format!("HTTP {}", resp.status());
                continue;
            }
            let bytes = match resp.bytes().await {
                Ok(b) => b,
                Err(e) => {
                    last_err = format!("read: {}", e);
                    continue;
                }
            };
            if bytes.is_empty() {
                last_err = "empty response".into();
                continue;
            }
            std::fs::write(&dest, &bytes).map_err(|e| format!("write {}: {}", local, e))?;
            wrote = true;
            break;
        }
        if !wrote {
            return Err(format!("download {}: {}", local, last_err));
        }
    }
    Ok(dir.to_string_lossy().into_owned())
}
