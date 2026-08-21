/*
{
  "CATEGORIES": [
    "Generator",
    "Retro",
    "POV",
    "BPM"
  ],
  "DESCRIPTION": "BPM-velocity POV dark-road lane generator for Resolume Wire. Forward road momentum is tied directly to BPM: beatsElapsed = TIME * bpm / 60.",
  "INPUTS": [
    {
      "NAME": "bpm",
      "LABEL": "BPM",
      "TYPE": "float",
      "DEFAULT": 120.0,
      "MIN": 20.0,
      "MAX": 240.0
    },
    {
      "NAME": "beatsPerDash",
      "LABEL": "Beats Per Dash",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.25,
      "MAX": 8.0
    },
    {
      "NAME": "motionMultiplier",
      "LABEL": "Motion Multiplier",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.0,
      "MAX": 8.0
    },
    {
      "NAME": "beatPulse",
      "LABEL": "Beat Pulse",
      "TYPE": "float",
      "DEFAULT": 0.35,
      "MIN": 0.0,
      "MAX": 1.0
    },
    {
      "NAME": "pulseSharpness",
      "LABEL": "Pulse Sharpness",
      "TYPE": "float",
      "DEFAULT": 6.0,
      "MIN": 1.0,
      "MAX": 24.0
    },
    {
      "NAME": "horizon",
      "LABEL": "Horizon",
      "TYPE": "float",
      "DEFAULT": 0.58,
      "MIN": 0.35,
      "MAX": 0.78
    },
    {
      "NAME": "laneSpacing",
      "LABEL": "Lane Spacing",
      "TYPE": "float",
      "DEFAULT": 0.85,
      "MIN": 0.35,
      "MAX": 1.7
    },
    {
      "NAME": "roadHalfWidth",
      "LABEL": "Road Half Width",
      "TYPE": "float",
      "DEFAULT": 2.15,
      "MIN": 1.1,
      "MAX": 4.0
    },
    {
      "NAME": "lineWidth",
      "LABEL": "Line Width",
      "TYPE": "float",
      "DEFAULT": 0.028,
      "MIN": 0.005,
      "MAX": 0.12
    },
    {
      "NAME": "dashDuty",
      "LABEL": "Dash Length",
      "TYPE": "float",
      "DEFAULT": 0.45,
      "MIN": 0.10,
      "MAX": 0.90
    },
    {
      "NAME": "glow",
      "LABEL": "Glow",
      "TYPE": "float",
      "DEFAULT": 1.35,
      "MIN": 0.0,
      "MAX": 4.0
    },
    {
      "NAME": "brightness",
      "LABEL": "Brightness",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.0,
      "MAX": 3.0
    },
    {
      "NAME": "roadCurve",
      "LABEL": "Road Curve",
      "TYPE": "float",
      "DEFAULT": 0.04,
      "MIN": -0.8,
      "MAX": 0.8
    },
    {
      "NAME": "roadWobble",
      "LABEL": "Road Wobble",
      "TYPE": "float",
      "DEFAULT": 0.07,
      "MIN": 0.0,
      "MAX": 0.6
    },
    {
      "NAME": "scanlines",
      "LABEL": "Scanlines",
      "TYPE": "float",
      "DEFAULT": 0.18,
      "MIN": 0.0,
      "MAX": 1.0
    },
    {
      "NAME": "colorA",
      "LABEL": "Cyan",
      "TYPE": "color",
      "DEFAULT": [
        0.0,
        0.88,
        1.0,
        1.0
      ]
    },
    {
      "NAME": "colorB",
      "LABEL": "Magenta",
      "TYPE": "color",
      "DEFAULT": [
        1.0,
        0.05,
        0.72,
        1.0
      ]
    }
  ]
}
*/

float sat(float v) {
    return clamp(v, 0.0, 1.0);
}

float lineCore(float x, float pos, float width, float aa) {
    float d = abs(x - pos);
    return 1.0 - smoothstep(width, width + aa, d);
}

float lineGlow(float x, float pos, float width) {
    float d = abs(x - pos);
    return exp(-d * d / max(width * width, 0.00001));
}

float dashMaskFromBeatDistance(float worldZ, float dashBeatLength, float duty) {
    // This is the actual BPM lock:
    // worldZ is measured in beat-distance units.
    // dashBeatLength = 1 means one dash cycle per beat.
    float f = fract(worldZ / max(dashBeatLength, 0.0001));

    // Soft leading/trailing edges avoid ugly zippering when BPM is high.
    float lead  = smoothstep(0.015, 0.075, f);
    float trail = 1.0 - smoothstep(duty, duty + 0.075, f);
    return lead * trail;
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;
    float aspect = RENDERSIZE.x / max(RENDERSIZE.y, 1.0);

    // BPM-derived clock.
    // 60 BPM  = 1 beat per second.
    // 120 BPM = 2 beats per second.
    // Therefore forward momentum scales directly with tempo.
    float beatsElapsed = TIME * max(bpm, 0.001) / 60.0;

    // One beat-distance unit per beat at motionMultiplier = 1.
    float beatTravel = beatsElapsed * motionMultiplier;

    // Downbeat pulse from the same BPM-derived beat phase.
    float beatPhase = fract(beatsElapsed);
    float pulse = pow(1.0 - beatPhase, pulseSharpness) * beatPulse;

    vec3 col = vec3(0.002, 0.003, 0.012);

    float belowHorizon = step(uv.y, horizon);
    float depth = max(horizon - uv.y, 0.002);
    float perspective = 1.0 / depth;

    // Road coordinates.
    // nearZ is perspective depth; beatTravel is the moving road offset.
    float nearZ = perspective * 0.56;
    float worldZ = nearZ + beatTravel;
    float x = (uv.x - 0.5) * aspect * perspective;

    // Road drift tied to BPM-derived travel.
    float farFactor = sat((worldZ - 1.0) * 0.06);
    float curve = roadCurve * sin(worldZ * 0.145 + beatTravel * 0.18) * farFactor;
    float wobble = roadWobble * sin(worldZ * 0.48 + beatTravel * 0.92) * farFactor * 0.22;
    x += curve + wobble;

    float distFade = exp(-nearZ * 0.032);
    float nearFade = smoothstep(0.015, 0.09, depth);
    float roadFade = belowHorizon * nearFade * distFade;

    // Road body.
    float roadMask = (1.0 - smoothstep(roadHalfWidth, roadHalfWidth + 0.12, abs(x))) * belowHorizon;
    col += vec3(0.010, 0.006, 0.022) * roadMask * nearFade;

    // One dash cycle every beatsPerDash beats.
    // Set beatsPerDash = 1 for one dash advance per beat.
    // Set beatsPerDash = 2 for half-time road motion.
    // Set beatsPerDash = 0.5 for two dash cycles per beat.
    float dash = dashMaskFromBeatDistance(worldZ, beatsPerDash, dashDuty);

    float aa = perspective / min(RENDERSIZE.x, RENDERSIZE.y);

    // Lane lines: center dash, adjacent guide lanes, solid outer road edges.
    float centerCore = lineCore(x, 0.0, lineWidth, aa) * dash;
    float leftCore   = lineCore(x, -laneSpacing, lineWidth * 0.82, aa) * dash * 0.82;
    float rightCore  = lineCore(x,  laneSpacing, lineWidth * 0.82, aa) * dash * 0.82;

    float edgeCoreL = lineCore(x, -roadHalfWidth, lineWidth * 1.15, aa);
    float edgeCoreR = lineCore(x,  roadHalfWidth, lineWidth * 1.15, aa);

    float core = centerCore + leftCore + rightCore + edgeCoreL + edgeCoreR;

    float centerGlow = lineGlow(x, 0.0, lineWidth * (7.5 + glow * 6.0)) * dash;
    float leftGlow   = lineGlow(x, -laneSpacing, lineWidth * (5.0 + glow * 4.0)) * dash * 0.7;
    float rightGlow  = lineGlow(x,  laneSpacing, lineWidth * (5.0 + glow * 4.0)) * dash * 0.7;
    float edgeGlowL  = lineGlow(x, -roadHalfWidth, lineWidth * (8.0 + glow * 5.0));
    float edgeGlowR  = lineGlow(x,  roadHalfWidth, lineWidth * (8.0 + glow * 5.0));

    float neonGlow = centerGlow + leftGlow + rightGlow + edgeGlowL + edgeGlowR;

    // Cyan/magenta cycle locked to BPM-derived road movement.
    float colorMix = 0.5 + 0.5 * sin(worldZ * 0.075 - beatTravel * 0.64);
    colorMix = mix(colorMix, 0.82, sat(pulse));
    vec3 neon = mix(colorA.rgb, colorB.rgb, colorMix);

    float beatBoost = 1.0 + pulse * 1.35;
    col += neon * neonGlow * glow * 0.34 * brightness * roadFade * beatBoost;
    col += mix(vec3(1.0), neon, 0.32) * core * 2.4 * brightness * roadFade * beatBoost;

    // Subtle horizon glow.
    float horizonLine = exp(-abs(uv.y - horizon) * 85.0);
    col += mix(colorB.rgb, colorA.rgb, 0.35) * horizonLine * 0.085 * brightness * (1.0 + pulse * 0.5);

    // Retro scanlines and pavement grain.
    float scan = 1.0 - scanlines * (0.5 + 0.5 * sin(uv.y * RENDERSIZE.y * 3.14159265));
    col *= scan;

    float noise = hash21(floor(vec2(x * 28.0, worldZ * 3.0)));
    col += vec3(noise * 0.014) * roadMask * roadFade;

    float vig = smoothstep(0.92, 0.22, length((uv - 0.5) * vec2(aspect, 1.0)));
    col *= mix(0.35, 1.0, vig);

    col = 1.0 - exp(-col);

    gl_FragColor = vec4(col, 1.0);
}
