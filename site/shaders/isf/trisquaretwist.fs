/*{
	"DESCRIPTION": "Tri/Square Twist V2 - REVd audio-reactive rework. Sprohgis' variant of WaveShapes, with independent control over the triangle and square side ratios. Bass skews the shape and swells the nest from frame centre, mid offsets each ring so the ripple travels outward, high sharpens the stroke at the rim, and the ripple phase is beat-locked.",
	"CREDIT": "Original 'WaveShapes' (SaturdayShader Week 31) by Joseph Fiola - http://www.joefiola.com, modified by Sprohgis, based on 'Electro-Prim's' by smb02dunnal. REVd V2 audio rework by REVd Cycling.",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"PASSES": [
		{ "TARGET": "bufA", "PERSISTENT": true, "FLOAT": true },
		{ }
	],
	"INPUTS": [
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Speed / BPM Mult" },
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (shape skew)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (ring sequence)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (stroke)" },
		{ "NAME": "beatPunch", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Beat Punch" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "triside1", "TYPE": "float", "DEFAULT": 3.0, "MIN": 0.1, "MAX": 3.0, "LABEL": "Triangle Ratio" },
		{ "NAME": "squareside1", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.1, "MAX": 10.0, "LABEL": "Square Ratio" },
		{ "NAME": "tunnel", "TYPE": "float", "DEFAULT": 1.1, "MIN": 0.25, "MAX": 1.75, "LABEL": "Tunnel Taper" },
		{ "NAME": "rings", "TYPE": "float", "DEFAULT": 20.0, "MIN": 2.0, "MAX": 20.0, "LABEL": "Rings" },
		{ "NAME": "tint", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Palette Tint (0 = mono)" },
		{ "NAME": "shape", "TYPE": "long", "DEFAULT": 0, "VALUES": [0, 1], "LABELS": ["Triangle", "Square"], "LABEL": "Shape" },
		{ "NAME": "zoom", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.1, "MAX": 10.0, "LABEL": "Zoom" },
		{ "NAME": "rotate", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Rotate" },
		{ "NAME": "twist", "TYPE": "float", "DEFAULT": 0.02, "MIN": 0.0, "MAX": 1.0, "LABEL": "Twist per Ring" },
		{ "NAME": "thickness", "TYPE": "float", "DEFAULT": 0.003, "MIN": 0.0005, "MAX": 0.2, "LABEL": "Stroke Thickness" },
		{ "NAME": "amplitude", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 100.0, "LABEL": "Ripple Amplitude" },
		{ "NAME": "frequency", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 50.0, "LABEL": "Ripple Frequency" },
		{ "NAME": "band", "TYPE": "float", "DEFAULT": 0.0, "MIN": -0.5, "MAX": 1.0, "LABEL": "Ripple Gate" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0, 1, 2, 3, 4, 5], "LABELS": ["Custom", "Recovery", "Endurance", "Tempo", "Threshold", "Sprint"], "LABEL": "Palette" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Custom Primary" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Custom Secondary" },
		{ "NAME": "pos", "TYPE": "point2D", "DEFAULT": [0.5, 0.5], "MIN": [0.0, 0.0], "MAX": [1.0, 1.0], "LABEL": "Position" }
	]
}*/

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// ---- REVd studio palette: effort zones -------------------------------------
void revdPalette(int idx, out vec3 pA, out vec3 pB) {
	if      (idx == 1) { pA = vec3(0.04, 0.30, 1.00); pB = vec3(0.00, 0.80, 0.95); } // Recovery
	else if (idx == 2) { pA = vec3(0.00, 0.85, 0.70); pB = vec3(0.30, 1.00, 0.40); } // Endurance
	else if (idx == 3) { pA = vec3(1.00, 0.62, 0.05); pB = vec3(1.00, 0.26, 0.00); } // Tempo
	else if (idx == 4) { pA = vec3(1.00, 0.10, 0.04); pB = vec3(0.40, 0.00, 0.10); } // Threshold
	else if (idx == 5) { pA = vec3(1.00, 0.95, 0.88); pB = vec3(1.00, 0.16, 0.32); } // Sprint
	else               { pA = color1.rgb;             pB = color2.rgb;             } // Custom
}

mat2 rotate2d(float a) {
	return mat2(cos(a), -sin(a), sin(a), cos(a));
}

float electro(vec2 uv, float d, float f, float o, float a, float b, float t) {
	float theta = atan(uv.y, uv.x);
	float amp   = smoothstep(0.0, 1.0, (sin(theta + t * PI) * 0.5 + 0.5) - b) * a;
	float phase = d + sin(theta * f + o + t * PI) * amp;
	return sin(clamp(phase, 0.0, PI * 2.0) + PI / 2.0) + 1.0005;
}

void main() {
	vec2 uvN = isf_FragNormCoord;

	// PASS 1: present the accumulated buffer.
	if (PASSINDEX == 1) {
		gl_FragColor = vec4(IMG_NORM_PIXEL(bufA, uvN).rgb, 1.0);
		return;
	}

	// ---- REVd audio core ---------------------------------------------------
	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	// Beat-locked time base. Wire's Transport Beat free-runs for the whole set, so
	// wrap it before use: this holds float precision and keeps motion identical at
	// hour three. 1024 is a multiple of 4, so per-beat and per-bar accents stay
	// phase-correct across the wrap. The 0.125 calibrates Speed = 1.0 to the REVd
	// house tempo; the TIME fallback is scaled to 2 beats/sec so a stopped
	// transport previews at 120 BPM.
	float bw    = mod(max(beat, 0.0), 1024.0);
	float bTime = (beat > 0.0) ? bw : TIME * 2.0;
	float r     = bTime * speed * 0.125;

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid,  0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float kick = (beat > 0.0) ? exp(-fract(bw)        * 6.0) * beatPunch : 0.0;
	float bar  = (beat > 0.0) ? exp(-fract(bw * 0.25) * 4.0) * beatPunch : 0.0;

	// Radial band windows - each band owns a region of the frame.
	vec2  bandP = (gl_FragCoord.xy + gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;
	float rd    = length(bandP) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rd);
	float wMid  = smoothstep(0.08, 0.42, rd) * (1.0 - smoothstep(0.58, 1.05, rd));
	float wHigh = smoothstep(0.30, 0.80, rd);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	float bWarp = bAmp * bassWarp * wBass + kick * 0.35;
	float mSeq  = mAmp * midRipple * wMid;

	// ---- nest --------------------------------------------------------------
	float radius = 0.1 * (1.0 + bWarp * 0.30);

	vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;
	uv -= pos;
	uv.x *= RENDERSIZE.x / RENDERSIZE.y;

	uv = rotate2d((rotate + bar * 0.03) * -TWO_PI) * uv;
	uv *= zoom * (1.0 - bWarp * 0.15);

	// BASS -> skews the side ratio, so the polygon itself deforms on a kick.
	// This is the distinguishing move of this variant over plain WaveShapes.
	float triR = max(triside1    * (1.0 + bWarp * 0.35), 0.05);
	float sqR  = max(squareside1 * (1.0 + bWarp * 0.35), 0.05);

	float thick = max(thickness * (1.0 - hAmp * highSparkle * wHigh * 0.55), 0.0005);
	float taper = tunnel * (1.0 + bWarp * 0.10);

	float t = r * mix(0.7, 1.3, si);
	float n = clamp(floor(rings), 2.0, 20.0);

	float grey = 0.0;

	for (int i = 0; i < 20; i++) {
		float fi = float(i);
		if (fi >= n) { break; }

		float d = 0.0;

		if (shape == 0) {
			float root2 = sqrt(triR);
			d = dot(uv, vec2(0.0, -2.0));
			d = max(d, dot(uv, vec2(-root2, 1.0)));
			d = max(d, dot(uv, vec2( root2, 1.0)));
		} else {
			d = max(abs(uv).x * sqR, abs(uv).y);
		}

		// MID -> per-ring ripple phase: energy travels outward through the nest.
		float seq = mSeq * 1.2 * sin(fi * 1.1 - r * 3.0);

		grey += 1.0 - smoothstep(0.0, thick, electro(uv, d / radius, frequency, 0.0 * PI + seq, amplitude, band, t));
		grey += 1.0 - smoothstep(0.0, thick, electro(uv, d / radius, frequency, 0.5 * PI + seq, amplitude, band, t));
		grey += 1.0 - smoothstep(0.0, thick, electro(uv, d / radius, frequency, 1.0 * PI + seq, amplitude, band, t));

		uv *= taper;
		uv = rotate2d(twist * -TWO_PI) * uv;
	}

	float cc = clamp(grey, 0.0, 1.0);

	vec3 mono   = vec3(cc);
	vec3 tinted = mix(pA, pB, cc) * cc;
	vec3 col    = mix(mono, tinted, clamp(tint, 0.0, 1.0));

	col += pB * hAmp * highSparkle * wHigh * cc * 0.30;
	col *= mix(0.85, 1.15, si);

	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(col, prev), 1.0);
}
