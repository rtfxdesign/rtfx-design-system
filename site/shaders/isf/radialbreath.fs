/*{
	"DESCRIPTION": "Radial Breath V2 — expanding ring streams with spatial audio binding, trail feedback and REVd studio palettes (Anti-Strobe)",
	"CREDIT": "REVd Cycling",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"PASSES": [
		{ "TARGET": "bufA", "PERSISTENT": true, "FLOAT": true },
		{ }
	],
	"INPUTS": [
		{
			"NAME": "stage",
			"TYPE": "float",
			"DEFAULT": 0.0,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Stage"
		},
		{
			"NAME": "bass",
			"TYPE": "float",
			"DEFAULT": 0.0,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Bass"
		},
		{
			"NAME": "mid",
			"TYPE": "float",
			"DEFAULT": 0.0,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Mid"
		},
		{
			"NAME": "high",
			"TYPE": "float",
			"DEFAULT": 0.0,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "High"
		},
		{
			"NAME": "intensity",
			"TYPE": "float",
			"DEFAULT": 0.7,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Reactivity"
		},
		{
			"NAME": "pulseRate",
			"TYPE": "float",
			"DEFAULT": 0.4,
			"MIN": 0.0,
			"MAX": 2.0,
			"LABEL": "Pulse Rate"
		},
		{
			"NAME": "lineGlow",
			"TYPE": "float",
			"DEFAULT": 0.5,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Glow"
		},
		{
			"NAME": "colorR",
			"TYPE": "float",
			"DEFAULT": 0.85,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Red"
		},
		{
			"NAME": "colorG",
			"TYPE": "float",
			"DEFAULT": 0.08,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Green"
		},
		{
			"NAME": "colorB",
			"TYPE": "float",
			"DEFAULT": 0.04,
			"MIN": 0.0,
			"MAX": 1.0,
			"LABEL": "Blue"
		},
		{
			"NAME": "palette", "TYPE": "long", "DEFAULT": 4,
			"VALUES": [0,1,2,3,4,5],
			"LABELS": ["Custom","Recovery","Endurance","Tempo","Threshold","Sprint"],
			"LABEL": "Palette"
		},
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (centre)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (streams)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (rim)" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.80, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" }
	]
}*/

// ---- REVd studio palette: effort zones -------------------------------------
void revdPalette(int idx, vec3 custom, out vec3 pA, out vec3 pB) {
	if      (idx == 1) { pA = vec3(0.04, 0.30, 1.00); pB = vec3(0.00, 0.80, 0.95); } // Recovery
	else if (idx == 2) { pA = vec3(0.00, 0.85, 0.70); pB = vec3(0.30, 1.00, 0.40); } // Endurance
	else if (idx == 3) { pA = vec3(1.00, 0.62, 0.05); pB = vec3(1.00, 0.26, 0.00); } // Tempo
	else if (idx == 4) { pA = vec3(1.00, 0.10, 0.04); pB = vec3(0.40, 0.00, 0.10); } // Threshold
	else if (idx == 5) { pA = vec3(1.00, 0.95, 0.88); pB = vec3(1.00, 0.16, 0.32); } // Sprint
	else               { pA = custom;                 pB = custom * vec3(0.35, 0.12, 0.05); }
}

void main() {
	vec2 uvPass = isf_FragNormCoord;

	// PASS 1: present the accumulated buffer.
	if (PASSINDEX == 1) {
		gl_FragColor = vec4(IMG_NORM_PIXEL(bufA, uvPass).rgb, 1.0);
		return;
	}

	vec2 uv  = isf_FragNormCoord - 0.5;
	//	Aspect-correct radius so rings are circular on 16:9
	vec2 uvA = uv * vec2(RENDERSIZE.x / RENDERSIZE.y, 1.0);
	float r  = length(uvA);
	float a  = atan(uv.y, uv.x);		//	angle for arc fragmentation

	vec3 pA, pB;
	revdPalette(int(palette), vec3(colorR, colorG, colorB), pA, pB);
	vec3 baseCol = pA;

	// Radial band windows — each band owns a region of the frame.
	float wBass = 1.0 - smoothstep(0.0, 0.28, r);
	float wMid  = smoothstep(0.04, 0.21, r) * (1.0 - smoothstep(0.29, 0.52, r));
	float wHigh = smoothstep(0.15, 0.40, r);

	//	-----------------------------------------------
	//	STAGE CURVE
	//	-----------------------------------------------
	float si        = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));
	float brightMul = mix(0.3, 1.0, si);
	float speedMul  = mix(0.12, 1.0, si);

	//	Number of concurrent ring streams
	// BASS -> radial domain warp at the centre: moves the rings, not the brightness.
	float rWarp = r + sin(r * 22.0 - TIME * 3.0) * bass * intensity * bassWarp * wBass * 0.045;

	float numRings = mix(1.0, 5.0, si) + bass * intensity * 1.5;
	numRings = clamp(numRings, 1.0, 5.0);

	//	Ring line width driven by mids
	float ringW = mix(0.006, 0.022, lineGlow) * (1.0 + mid * intensity * 0.8);

	//	Glow sharpness
	float glowSharp = mix(800.0, 80.0, lineGlow);

	//	Arc fragmentation from highs
	//	Breaks rings into dashes by modulating with angle
	float dashFreq  = 8.0 + si * 12.0;
	float dashPhase = TIME * 0.8 * speedMul;
	float dash      = sin(a * dashFreq + dashPhase) * 0.5 + 0.5;
	float fragAmt   = high * intensity * si;
	float rimSpark  = (0.5 + 0.5 * sin(a * 46.0 + TIME * 7.0))
	                * high * intensity * highSparkle * wHigh;
	//	dash = 1 when intact, dips toward 0 at fragmentation points
	float arcMask   = mix(1.0, step(0.35, dash), fragAmt);

	float totalLight = 0.0;
	vec3  totalColor = vec3(0.0);

	//	-----------------------------------------------
	//	RING STREAMS
	//	Each stream pulses rings outward at its own phase offset
	//	-----------------------------------------------
	for (int i = 0; i < 5; i++) {
		float fi     = float(i);
		float activeMask = step(fi, numRings - 1.0);

		//	Phase offset per stream so rings don't all overlap
		float phaseOff = fi * 0.2;

		//	Ring travel: phase maps to 0..maxR over time
		float speed  = pulseRate * speedMul + bass * intensity * 0.3;
		float maxR   = 0.8;
		float phase  = fract(TIME * speed * 0.18 + phaseOff);

		//	Ring radius at this moment
		float ringR  = phase * maxR;

		//	Distance from ring edge
		// MID -> per-stream radius offset, so streams ripple in sequence.
		float streamPhase = sin(fi * 1.9 + TIME * 2.4);
		ringR += streamPhase * mid * intensity * midRipple * wMid * 0.05;

		float d      = abs(rWarp - ringR);

		//	Gaussian ring line
		float ring   = exp(-d * d * glowSharp / (ringW * ringW));

		//	Fade out as ring reaches edge
		ring *= 1.0 - smoothstep(maxR * 0.7, maxR, ringR);

		//	Apply arc fragmentation mask
		ring *= mix(1.0, arcMask, si * 0.6);

		//	Color cools as ring expands (born bright, fades to ember)
		vec3 ringCol = mix(baseCol * vec3(0.3, 0.04, 0.0), baseCol, 1.0 - phase);

		totalLight += ring * activeMask;
		totalColor += ringCol * ring * activeMask;
	}

	//	Center origin glow — gentle at warmup, pulses on bass at peak
	float centerGlow = exp(-r * r * 60.0) * mix(0.15, 0.0, si * 0.5)
	                 + exp(-r * r * 40.0) * bass * intensity * 0.6 * si;

	totalLight += centerGlow;
	totalColor += baseCol * centerGlow;

	// HIGH -> edge-gated emission at the rim: reads as detail, not flash.
	totalColor += pB * rimSpark * totalLight * 0.45;

	totalLight = min(totalLight, 1.6);
	vec3 finalCol = totalColor * brightMul;

	//	Vignette
	float vig = 1.0 - dot(uv, uv) * 0.5;
	finalCol *= max(vig, 0.0);

	// Trails: max-blend against the decayed previous frame — cannot run away.
	vec3 prev = IMG_NORM_PIXEL(bufA, uvPass).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(finalCol, prev), 1.0);
}
