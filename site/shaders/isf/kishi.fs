/*{
  "DESCRIPTION": "Master Fractal + IQ Palette Generator",
  "CREDIT": "Fractal by kishimisu, Palette by IQ, Optimization by Gemini",
  "ISFVSN": "2.0",
  "CATEGORIES": ["GENERATOR"],
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 0.4, "MIN": 0.0, "MAX": 2.0, "LABEL": "Animation Speed" },
    { "NAME": "iterations", "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 8.0, "LABEL": "Fractal Layers" },
    { "NAME": "fract_mult", "TYPE": "float", "DEFAULT": 1.5, "MIN": 1.0, "MAX": 3.0, "LABEL": "Space Repetition" },
    { "NAME": "glow_intensity", "TYPE": "float", "DEFAULT": 0.01, "MIN": 0.001, "MAX": 0.05, "LABEL": "Glow Strength" },
    { "NAME": "pal_a", "TYPE": "color", "DEFAULT": [0.5, 0.5, 0.5, 1.0], "LABEL": "Palette Bias (A)" },
    { "NAME": "pal_b", "TYPE": "color", "DEFAULT": [0.5, 0.5, 0.5, 1.0], "LABEL": "Palette Amp (B)" },
    { "NAME": "pal_c", "TYPE": "color", "DEFAULT": [1.0, 1.0, 1.0, 1.0], "LABEL": "Palette Freq (C)" },
    { "NAME": "pal_d", "TYPE": "color", "DEFAULT": [0.0, 0.1, 0.2, 1.0], "LABEL": "Palette Phase (D)" }
  ]
}*/

precision highp float;

// Inigo Quilez Cosine Palette Implementation
vec3 palette(float t) {
    return pal_a.rgb + pal_b.rgb * cos(6.28318 * (pal_c.rgb * t + pal_d.rgb));
}

void main() {
    // Coordinate Normalization
    vec2 uv = (isf_FragNormCoord.xy * 2.0 - 1.0);
    uv.x *= RENDERSIZE.x / RENDERSIZE.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    // Fractal Iteration Loop
    for (float i = 0.0; i < 8.0; i++) {
        if (i >= iterations) break;
        
        // Space Repetition
        uv = fract(uv * fract_mult) - 0.5;

        // Signed Distance Calculation
        float d = length(uv) * exp(-length(uv0));

        // Dynamic Palette Selection
        vec3 col = palette(length(uv0) + i * 0.4 + TIME * speed);

        // Neon Glow Math
        d = sin(d * 8.0 + TIME * speed) / 8.0;
        d = abs(d);
        d = pow(glow_intensity / d, 1.2);

        finalColor += col * d;
    }
        
    gl_FragColor = vec4(finalColor, 1.0);
}