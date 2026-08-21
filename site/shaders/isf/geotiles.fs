/*{
  "DESCRIPTION": "Truchet Pattern Generator - Single Pass",
  "CREDIT": "Original by @liu7d7, Wire optimization by Gemini",
  "ISFVSN": "2.0",
  "CATEGORIES": ["GENERATOR"],
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0 },
    { "NAME": "rotationSpeed", "TYPE": "float", "DEFAULT": 0.125, "MIN": -0.5, "MAX": 0.5 },
    { "NAME": "scale", "TYPE": "float", "DEFAULT": 900.0, "MIN": 100.0, "MAX": 2000.0 },
    { "NAME": "colorShift", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.1, "MAX": 2.0 },
    { "NAME": "colorA", "TYPE": "color", "DEFAULT": [0.5, 0.5, 0.5, 1.0] },
    { "NAME": "colorB", "TYPE": "color", "DEFAULT": [0.5, 0.5, 0.5, 1.0] },
    { "NAME": "colorC", "TYPE": "color", "DEFAULT": [0.8, 0.8, 0.5, 1.0] },
    { "NAME": "colorD", "TYPE": "color", "DEFAULT": [0.0, 0.2, 0.5, 1.0] }
  ]
}*/

#define PI 3.1415926
#define rot(t) mat2(cos(t), sin(t), -sin(t), cos(t))

// WebGL1 port: the original murmur-style uint hash needs GLSL ES 3.0 -
// a float hash with the same per-cell 0..3 orientation pick stands in.
float hash4(vec2 src) {
    return floor(fract(sin(dot(floor(src), vec2(127.1, 311.7))) * 43758.5453) * 4.0);
}

float triangle(float t, float p, float a) {
    float m = mod(t, p), hp = p * 0.5;
    float s = step(hp, m);
    return (m * (1.0 - s) + (p - m) * s) / hp * a;
}

vec3 colorFunc(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(2.0 * PI * (c * t + d));
}

vec4 truchet(vec2 p, float r, float w, float time, vec3 a, vec3 b, vec3 c, vec3 d, float colorShiftSpeed) {
    float hr = r / 2.0;
    float hw = w / 2.0;
    vec2 b_pos = floor(p / r) * r;
    vec2 c_pos = b_pos + vec2(hr);
    float h = hash4(abs(c_pos * 100.0));
    float i = 3.0 - h;
    vec2 a0 = b_pos + vec2(mod(h, 2.0) * r, floor(h / 2.0) * r);
    vec2 a1 = b_pos + vec2(mod(i, 2.0) * r, floor(i / 2.0) * r);
    float d1 = distance(p, a0);
    float d2 = distance(p, a1);
    float dist = min(d1, d2);
    vec3 colorVal = colorFunc(triangle(time * colorShiftSpeed, 3.0, 1.0), a, b, c, d);
    float alpha = (1.0 - (abs(dist - hr) - hw) / w) * 0.5;
    return vec4(1.0) * (1.0 - smoothstep(hw, hw + 1.414, abs(dist - hr))) + 
           vec4(colorVal, alpha) * (smoothstep(hw, hw + 1.414, abs(dist - hr)));
}

void main() {
    float effectiveTime = TIME * speed;
    vec2 uv = (2.0 * gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;
    uv *= scale / 2.0;
    uv = rot(effectiveTime * rotationSpeed) * uv;
    
    vec3 final = vec3(0.0);
    for (float i = 3.0; i > -0.1; i--) {
        vec4 truc = truchet(
            (uv + vec2(sin(effectiveTime * 1.3) * (400.0 - 400.0/6.0 * i), 
                      cos(effectiveTime * 0.7) * (400.0 - 400.0/6.0 * i))), 
            80.0 - i * 20.0,  
            10.0 - i * 2.0,
            effectiveTime,
            colorA.rgb, colorB.rgb, colorC.rgb, colorD.rgb,
            colorShift
        ) * (4.0 - i * 0.75) * 0.25;
        final = final * (1.0 - truc.a) + clamp(truc.rgb, 0.0, 1.0) * truc.a;
    }
    
    gl_FragColor = vec4(final, 1.0);
}