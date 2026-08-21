/*{
	"DESCRIPTION": "Cadence Tachometer — RPM dials, spinning needles, and redline flares for REVd cycling (Transport Beat synced, Anti-Strobe, Custom Colors)",
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
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "RPM Speed / BPM Mult" },
		{ "NAME": "dials", "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 8.0, "LABEL": "Dial Rings" },
		{ "NAME": "glowFalloff", "TYPE": "float", "DEFAULT": 5.0, "MIN": 1.0, "MAX": 15.0, "LABEL": "Glow" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Primary Color" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Secondary Color" },
		{ "NAME": "color3", "TYPE": "color", "DEFAULT": [0.1, 0.5, 0.8, 1.0], "LABEL": "Tertiary Color" },
		{ "NAME": "color4", "TYPE": "color", "DEFAULT": [0.8, 0.1, 0.5, 1.0], "LABEL": "Quaternary Color" }
	]
}*/


vec3 getPalette(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    vec3 c01 = mix(color1.rgb, color2.rgb, clamp(t, 0.0, 1.0));
    vec3 c12 = mix(c01, color3.rgb, clamp(t - 1.0, 0.0, 1.0));
    return mix(c12, color4.rgb, clamp(t - 2.0, 0.0, 1.0));
}

void main() {
	vec3 O = vec3(0.0);
	vec2 F = gl_FragCoord.xy;
	vec2 V = RENDERSIZE.xy;

	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	float bTime = (beat > 0.0) ? beat : TIME;
	float r = mod(bTime * speed * 0.2 * mix(0.4, 1.3, si), 628.3185);

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float glow = glowFalloff / (1.0 + bAmp * 3.0);
	float maxDials = floor(dials + mAmp * 3.0 + 0.5);

	vec2 uv = (F + F - V) / V.y;
	float radius = length(uv);
	float theta = atan(uv.y, uv.x);

	float shock = fract(radius * 3.0 - r * 0.5);
	float bPulse = exp(-shock * shock * 12.0) * bAmp * 0.15;
	radius += bPulse;

	for (int i = 0; i < 8; i++) {
		if (float(i) >= maxDials) {
			break;
		}

		float fi = float(i);
		float dialR = 0.2 + fi * 0.12;

		float dRing = abs(radius - dialR) - (0.004 + bAmp * 0.006);

		float needleAng = mod(r * (0.5 + fi * 0.1) + fi * 1.2, 6.28318);
		float arcLen = 3.14159 * (0.4 + si * 0.5);
		float rawAngDiff = abs(theta - needleAng);
		if (rawAngDiff > 3.14159) rawAngDiff = 6.28318 - rawAngDiff;
		float angDiff = rawAngDiff;
		float arcMask = smoothstep(arcLen, arcLen - 0.2, angDiff);

		float ticks = abs(sin(theta * (20.0 + fi * 10.0))) - 0.7;
		ticks = max(ticks, 0.0) * hAmp;

		float x = dRing - ticks * 0.01;

		float den = glow + abs(x) * 350.0;
		float env = (0.4 + 0.6 * arcMask);

		float rW = 1.0 + cos(radius * 10.0 - r * 0.5 + fi);
		float blendFactor = 0.5 + 0.5 * cos(theta * 3.0 + r * 0.5);
		vec3 fire = rW * getPalette( blendFactor);

		O += fire * env / (den + (1.0 - arcMask) * 200.0);
	}

	float cGlow = exp(-radius * radius * 8.0) * (0.3 + bAmp * 0.8);
	O += color1.rgb * cGlow;

	gl_FragColor = vec4(O, 1.0);
}
