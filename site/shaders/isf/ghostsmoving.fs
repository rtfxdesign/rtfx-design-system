/*{
  "DESCRIPTION": "Procedural glitchy RGB ghosts for Resolume Wire / ISF. Generates ghost silhouettes with chromatic offsets, scanline corruption, halftone grain, and optional tiling.",
  "CREDIT": "Allen Grabo + ChatGPT",
  "CATEGORIES": ["Generator", "Glitch", "Stylize"],
  "INPUTS": [
    {"NAME":"Speed", "TYPE":"float", "DEFAULT":0.45, "MIN":0.0, "MAX":3.0},
    {"NAME":"Beat_Transport", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":64.0},
    {"NAME":"Move_X", "TYPE":"float", "DEFAULT":1.0, "MIN":-1.0, "MAX":1.0},
    {"NAME":"Move_Y", "TYPE":"float", "DEFAULT":0.0, "MIN":-1.0, "MAX":1.0},
    {"NAME":"Ghost_Size", "TYPE":"float", "DEFAULT":0.62, "MIN":0.18, "MAX":1.4},
    {"NAME":"Tiling", "TYPE":"float", "DEFAULT":1.0, "MIN":1.0, "MAX":8.0},
    {"NAME":"Tiling_Jitter", "TYPE":"float", "DEFAULT":0.22, "MIN":0.0, "MAX":1.0},
    {"NAME":"RGB_Offset", "TYPE":"float", "DEFAULT":0.075, "MIN":0.0, "MAX":0.25},
    {"NAME":"Ghost_Trail", "TYPE":"float", "DEFAULT":0.55, "MIN":0.0, "MAX":1.0},
    {"NAME":"Glitch_Amount", "TYPE":"float", "DEFAULT":0.42, "MIN":0.0, "MAX":1.0},
    {"NAME":"Glitch_Scale", "TYPE":"float", "DEFAULT":72.0, "MIN":8.0, "MAX":220.0},
    {"NAME":"Scanlines", "TYPE":"float", "DEFAULT":0.45, "MIN":0.0, "MAX":1.0},
    {"NAME":"Halftone", "TYPE":"float", "DEFAULT":0.24, "MIN":0.0, "MAX":1.0},
    {"NAME":"Noise", "TYPE":"float", "DEFAULT":0.16, "MIN":0.0, "MAX":1.0},
    {"NAME":"Background_Glitch", "TYPE":"float", "DEFAULT":0.45, "MIN":0.0, "MAX":1.0},
    {"NAME":"Invert", "TYPE":"bool", "DEFAULT":false},
    {"NAME":"Alpha", "TYPE":"float", "DEFAULT":1.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Audio", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Beat_Pulse", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0}
  ]
}*/

#ifdef GL_ES
precision mediump float;
#endif

// Wire supplies Beat_Transport through the shader input. ISF provides RENDERSIZE and isf_FragNormCoord.

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float boxSDF(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float circleSDF(vec2 p, float r) {
    return length(p) - r;
}

float ghostMask(vec2 p) {
    // p is centered, roughly -1..1. Positive mask is inside.
    p.y += 0.08;

    // Main body: rounded arch plus rectangular body.
    float head = circleSDF(p - vec2(0.0, 0.24), 0.47);
    float body = boxSDF(p - vec2(0.0, -0.12), vec2(0.47, 0.47));
    float shape = min(head, body);

    // Three scallops cut from bottom.
    float cut1 = circleSDF(p - vec2(-0.31, -0.60), 0.18);
    float cut2 = circleSDF(p - vec2( 0.00, -0.60), 0.20);
    float cut3 = circleSDF(p - vec2( 0.31, -0.60), 0.18);
    float cuts = min(cut1, min(cut2, cut3));
    shape = max(shape, -cuts);

    // Convert SDF to soft mask.
    return 1.0 - smoothstep(-0.012, 0.012, shape);
}

float eyeMask(vec2 p) {
    float e1 = circleSDF(p - vec2(-0.18, 0.19), 0.095);
    float e2 = circleSDF(p - vec2( 0.18, 0.19), 0.095);
    float eyes = min(e1, e2);
    return 1.0 - smoothstep(-0.01, 0.01, eyes);
}

float glitchLine(vec2 uv, float t) {
    float row = floor(uv.y * Glitch_Scale);
    float n = hash11(row + floor(t * 16.0) * 17.13);
    float rare = step(0.78, n);
    float thin = step(0.45, hash11(row * 4.91 + t));
    return rare * thin;
}

vec3 ghostRGB(vec2 p, float t, float cellSeed) {
    float beat = clamp(Beat_Pulse, 0.0, 1.0);
    float audio = clamp(Audio, 0.0, 1.0);
    float pulse = 1.0 + 0.08 * audio + 0.12 * beat;

    float wob = sin(t * 1.7 + cellSeed * 6.2831) * 0.018;
    vec2 drift = vec2(wob, sin(t * 1.1 + cellSeed * 12.0) * 0.012);

    float off = RGB_Offset * (0.55 + 0.45 * audio + 0.65 * beat);

    float r = ghostMask((p + vec2( off, 0.0) + drift) / pulse);
    float g = ghostMask((p + vec2( 0.0, 0.0) + drift * 0.4) / pulse);
    float b = ghostMask((p + vec2(-off, 0.0) - drift) / pulse);

    // Shadow/trail layers behind the main ghost.
    float trail = Ghost_Trail;
    r += ghostMask(p + vec2(off * 2.0 + 0.09, -0.01)) * trail * 0.28;
    b += ghostMask(p - vec2(off * 2.0 + 0.09,  0.01)) * trail * 0.28;

    vec3 col = vec3(r, g, b);

    // Punch black eyes through all channels, but keep some chromatic smear around them.
    float eyes = eyeMask(p + drift * 0.5);
    float eyeHaloR = eyeMask(p + vec2( off * 0.9, 0.0));
    float eyeHaloB = eyeMask(p + vec2(-off * 0.9, 0.0));
    col *= 1.0 - eyes;
    col += vec3(eyeHaloR, 0.0, eyeHaloB) * 0.16;

    return clamp(col, 0.0, 1.0);
}

void main() {
    vec2 uv = isf_FragNormCoord.xy;
    vec2 aspect = vec2(RENDERSIZE.x / max(RENDERSIZE.y, 1.0), 1.0);
    // Beat_Transport should be connected to Wire's Beat Transport output.
    // It may be a repeating 0..1 phase or a continuously increasing beat count.
    // fract() makes either form usable as a seamless one-beat movement phase.
    float transportPhase = fract(max(Beat_Transport, 0.0));
    float t = Beat_Transport * Speed * 8.0;
    float beat = clamp(Beat_Pulse, 0.0, 1.0);
    float audio = clamp(Audio, 0.0, 1.0);

    // Tile count is needed before movement so one transport cycle moves exactly
    // one tile. That makes the loop seamless when Beat Transport resets.
    float tiles = max(1.0, floor(Tiling + 0.5));

    // Positive X moves right; negative X moves left.
    // Positive Y moves up; negative Y moves down.
    // We subtract the sampling offset because moving the sample left moves the
    // visible image right. Dividing by tiles preserves one-cell travel per beat.
    vec2 moveOffset = vec2(Move_X, Move_Y) * transportPhase / tiles;

    // Horizontal signal tear. Safe and cheap: per-row offset from hash.
    float line = glitchLine(uv, t);
    float row = floor(uv.y * Glitch_Scale);
    float rowN = hash11(row + floor(t * 18.0));
    float tear = (rowN - 0.5) * Glitch_Amount * (0.08 + 0.08 * audio + 0.12 * beat) * line;
    vec2 guv = uv - moveOffset + vec2(tear, 0.0);

    // Tile space, with each cell getting a tiny unique shove.
    vec2 gridUV = guv * tiles;
    vec2 cell = floor(gridUV);
    vec2 local = fract(gridUV) - 0.5;
    float seed = hash21(cell + 19.17);

    local.x *= aspect.x;
    local += vec2(hash21(cell + 2.1) - 0.5, hash21(cell + 8.7) - 0.5) * Tiling_Jitter * 0.20;
    local += vec2(sin(t * 0.6 + seed * 10.0), cos(t * 0.5 + seed * 7.0)) * 0.025 * Tiling_Jitter;
    local /= max(Ghost_Size, 0.001);

    vec3 ghost = ghostRGB(local, t, seed);

    // Glitch background: tiny colored dashes and data scars.
    float dashRows = floor(uv.y * 180.0);
    float dashCols = floor(uv.x * 80.0);
    float dashSeed = hash21(vec2(dashCols, dashRows) + floor(t * 20.0));
    float dash = step(0.985 - Background_Glitch * 0.08, dashSeed);
    float dashBand = smoothstep(0.48, 0.52, fract(uv.x * (6.0 + 36.0 * hash11(dashRows)) + t * 0.5));
    vec3 bgDash = vec3(
        dash * hash11(dashRows + 1.0),
        dash * hash11(dashRows + 5.0),
        dash * hash11(dashRows + 9.0)
    ) * dashBand * Background_Glitch;

    // Scanlines and halftone stipple.
    float scan = 1.0 - Scanlines * (0.35 + 0.25 * sin((uv.y * RENDERSIZE.y) * 3.14159));
    float dotPattern = step(0.42 + Halftone * 0.22, hash21(floor(uv * RENDERSIZE.xy * 0.85)));
    float halftone = mix(1.0, dotPattern, Halftone * 0.75);

    // Grain / compression crawl.
    float grain = (hash21(uv * RENDERSIZE.xy + floor(t * 60.0)) - 0.5) * Noise;

    vec3 col = ghost + bgDash;
    col *= scan;
    col *= halftone;
    col += grain;

    // Occasional horizontal color bars over everything.
    float bars = line * Background_Glitch;
    vec3 barCol = vec3(hash11(row + 3.0), hash11(row + 13.0), hash11(row + 23.0));
    col = mix(col, barCol, bars * 0.45);

    // Keep it punchy for Resolume compositing.
    col = clamp(col, 0.0, 1.0);
    if (Invert) {
        col = 1.0 - col;
    }

    gl_FragColor = vec4(col, Alpha);
}
