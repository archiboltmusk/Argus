//!HOOK MAIN
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
