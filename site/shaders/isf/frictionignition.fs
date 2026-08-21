/*{
	"DESCRIPTION": "Friction Ignition — Kinetic friction ember vortex and spark explosion for REVd cycling (Transport Beat synced, Anti-Strobe, Custom Colors)",
	"CREDIT": "REVd Cycling",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"INPUTS": [
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 1024.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Vortex Speed / BPM Mult" },
		{ "NAME": "sparkCount", "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.1, "MAX": 1.5, "LABEL": "Spark Density" },
		{ "NAME": "glowFalloff", "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 15.0, "LABEL": "Glow" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Primary Color" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Secondary Color" }
	]
}*/

void main() {
	vec3 O = vec3(0.0);
	vec2 F = gl_FragCoord.xy;
	vec2 V = RENDERSIZE.xy;

	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	float bTime = (beat > 0.0) ? beat : TIME;
	float r = mod(bTime * speed * 0.2 * mix(0.4, 1.3, si), 628.3185);

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0),  0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float glow = glowFalloff / (1.0 + bAmp * 3.5);
	float maxI = mix(20.0, 60.0, si) + mAmp * 15.0;

	float t = 0.1;
	float x = 0.0;

	for (int i = 0; i < 60; i++) {
		if (float(i) >= maxI) {
			break;
		}

		float aRot = r * 0.15 + t * 0.05;
		vec4 cRot = cos(vec4(0.0, 11.0, 33.0, 0.0) + aRot);
		mat2 mRot = mat2(cRot.x, cRot.y, cRot.z, cRot.w);

		vec2 uv = (F + F - V) * mRot;
		vec3 o = t * normalize(vec3(uv, V.y));

		o.y += t * t * 0.15;

		float seg = sparkCount * mix(0.18, 0.06, si);
		seg = max(seg, 0.025);
		o.z = mod(o.z + r, seg) - seg * 0.5;

		o.x = fract(o.x * 2.0) - 0.5;
		o.y = fract(o.y * 2.0 + hAmp * 0.3) - 0.5;

		x = length(o) * 0.7 - (0.006 + bAmp * 0.008);
		t += x;

		float fi = float(i);
		float rW = 1.0 + cos(t * 0.8 + r * 0.5 + fi * 0.06);
		float env = 0.35 + sin(3.0 * t + r * 0.5) * 0.28;
		float den = glow + abs(x) * 450.0;

		float blendFactor = 0.5 + 0.5 * cos(t * 0.4 + fi * 0.05);
		vec3 fire = rW * mix(color1.rgb, color2.rgb, blendFactor);

		O += fire * env / den;
	}

	gl_FragColor = vec4(O, 1.0);
}
