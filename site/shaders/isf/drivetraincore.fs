/*{
	"DESCRIPTION": "Drivetrain Core — a rotating chainring and cassette with a live chain, wrapped in a power and heart-rate gauge for REVd cycling. Gear shifts move the chain across the cassette, Power fills the outer arc, Heart Rate throbs the inner ring. Transport Beat drives cadence. Anti-Strobe, studio palettes.",
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
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "cadence", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Cadence / BPM Mult" },
		{ "NAME": "power", "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.0, "MAX": 1.0, "LABEL": "Power (outer arc)" },
		{ "NAME": "heartRate", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0, "LABEL": "Heart Rate (inner throb)" },
		{ "NAME": "gear", "TYPE": "float", "DEFAULT": 5.0, "MIN": 1.0, "MAX": 11.0, "LABEL": "Gear (cassette position)" },
		{ "NAME": "teeth", "TYPE": "float", "DEFAULT": 34.0, "MIN": 11.0, "MAX": 53.0, "LABEL": "Chainring Teeth" },
		{ "NAME": "ringRadius", "TYPE": "float", "DEFAULT": 0.34, "MIN": 0.12, "MAX": 0.55, "LABEL": "Chainring Radius" },
		{ "NAME": "chainAmount", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Chain Visibility" },
		{ "NAME": "torqueBlur", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Torque Smear" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0,1,2,3,4,5], "LABELS": ["Custom","Recovery","Endurance","Tempo","Threshold","Sprint"], "LABEL": "Palette" },
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (centre)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (teeth)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (rim)" },
		{ "NAME": "softness", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 4.0, "LABEL": "Edge Softness (px)" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.72, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Custom Primary" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Custom Secondary" }
	]
}*/

// ---- REVd studio palette: effort zones -------------------------------------
void revdPalette(int idx, out vec3 pA, out vec3 pB) {
	if      (idx == 1) { pA = vec3(0.04, 0.30, 1.00); pB = vec3(0.00, 0.80, 0.95); } // Recovery
	else if (idx == 2) { pA = vec3(0.00, 0.85, 0.70); pB = vec3(0.30, 1.00, 0.40); } // Endurance
	else if (idx == 3) { pA = vec3(1.00, 0.62, 0.05); pB = vec3(1.00, 0.26, 0.00); } // Tempo
	else if (idx == 4) { pA = vec3(1.00, 0.10, 0.04); pB = vec3(0.40, 0.00, 0.10); } // Threshold
	else if (idx == 5) { pA = vec3(1.00, 0.95, 0.88); pB = vec3(1.00, 0.16, 0.32); } // Sprint
	else               { pA = color1.rgb;             pB = color2.rgb;             } // Custom
}

// ---- Resolution-independent edges ------------------------------------------
float aaStep(float edge, float v, float soft) {
	float w = max(fwidth(v), 1e-6) * max(soft, 0.5);
	return smoothstep(edge - w, edge + w, v);
}

float hash11(float p) { return fract(sin(p * 127.1) * 43758.5453); }

// Toothed sprocket: a circle whose radius is modulated by a rounded tooth
// profile, so the teeth are real geometry rather than painted-on marks.
float sdSprocket(vec2 q, float rr, float nTeeth, float toothDepth, float phase) {
	float a = atan(q.y, q.x);
	float d = length(q);
	float tooth = cos(a * nTeeth + phase);
	// Flatten the valleys and round the tips — closer to an involute profile
	// than a raw cosine, which otherwise reads as a wavy blob.
	tooth = sign(tooth) * pow(abs(tooth), 0.55);
	float rEdge = rr + tooth * toothDepth;
	return d - rEdge;
}

// Chain run: two straight spans tangent to the rings plus the wrap arcs.
float sdSegment(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a, ba = b - a;
	float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
	return length(pa - ba * h);
}

void main() {
	vec2 uvN = isf_FragNormCoord;

	// PASS 1: present the accumulated buffer.
	if (PASSINDEX == 1) {
		gl_FragColor = vec4(IMG_NORM_PIXEL(bufA, uvN).rgb, 1.0);
		return;
	}

	vec2  V = RENDERSIZE.xy;
	vec2  p = (gl_FragCoord.xy * 2.0 - V) / V.y;

	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	float bTime = (beat > 0.0) ? beat : TIME;
	float t     = bTime * cadence * 0.0098;

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid,  0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	// Radial band windows — each band owns a region of the frame.
	float rad0  = length(p) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rad0);
	float wMid  = smoothstep(0.08, 0.42, rad0) * (1.0 - smoothstep(0.58, 1.05, rad0));
	float wHigh = smoothstep(0.30, 0.80, rad0);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	// BASS -> low-frequency domain warp at the centre: the drivetrain flexes
	// under load rather than the frame flashing.
	p += vec2(sin(p.y * 3.4 + t * 5.6), cos(p.x * 3.0 - t * 4.8))
	   * bAmp * bassWarp * wBass * 0.030;

	// Crank angle. Torque peaks twice per revolution, at each downstroke.
	float crank  = t * 6.28318;
	float torque = pow(abs(sin(crank)), 1.6);

	vec3  col = vec3(0.0);
	float r   = length(p);
	float a   = atan(p.y, p.x);

	// ---------------------------------------------------------------- chainring
	vec2  ringC = vec2(-0.30, -0.02);
	vec2  qRing = p - ringC;
	float nT    = floor(teeth);

	// MID -> per-tooth phase: each tooth carries its own index, so a ripple
	// runs around the ring instead of the whole sprocket pulsing.
	float toothId    = floor((atan(qRing.y, qRing.x) + 3.14159) / 6.28318 * nT);
	float toothPhase = sin(toothId * 1.9 + t * 6.0);
	float ripple     = mAmp * midRipple * wMid * toothPhase;

	float ringR  = ringRadius;
	float dRing  = sdSprocket(qRing, ringR, nT, 0.016 + ripple * 0.006, -crank);
	float ringBody = 1.0 - aaStep(0.0, dRing, softness);
	float ringEdge = exp(-abs(dRing) * 260.0);

	// Spider arms — five, like a real crankset.
	float armA   = atan(qRing.y, qRing.x) + crank;
	float arms   = abs(cos(armA * 2.5));
	float spider = (1.0 - aaStep(ringR * 0.92, length(qRing), softness))
	             * smoothstep(0.55, 1.0, arms)
	             * (1.0 - aaStep(0.055, length(qRing), softness) * 0.0);
	spider *= smoothstep(0.05, 0.09, length(qRing));

	col += pB * ringBody * 0.10;
	col += pA * spider * 0.14;
	col += mix(pA, vec3(1.0), 0.25) * ringEdge * (0.55 + torque * 0.75);

	// Crank arm sweeping round, brightest through the power stroke.
	vec2  crankTip = ringC + vec2(cos(crank), sin(crank)) * ringR * 1.12;
	float dCrank   = sdSegment(p, ringC, crankTip);
	float crankArm = 1.0 - aaStep(0.016, dCrank, softness);
	col += mix(pA, vec3(1.0), 0.35) * crankArm * (0.35 + torque * 0.9);

	// ----------------------------------------------------------------- cassette
	// Gear selects which sprocket the chain sits on: higher gear, smaller cog.
	float gearN   = clamp(gear, 1.0, 11.0);
	float cogR    = mix(0.155, 0.055, (gearN - 1.0) / 10.0);
	vec2  cogC    = vec2(0.34, -0.02);
	vec2  qCog    = p - cogC;
	// Cog spins faster than the ring by the gear ratio.
	float ratio   = ringR / max(cogR, 0.02);
	float dCog    = sdSprocket(qCog, cogR, max(floor(nT / ratio), 9.0), 0.011, -crank * ratio);
	float cogBody = 1.0 - aaStep(0.0, dCog, softness);
	float cogEdge = exp(-abs(dCog) * 300.0);
	col += pB * cogBody * 0.10;
	col += mix(pA, vec3(1.0), 0.2) * cogEdge * (0.5 + torque * 0.6);

	// Ghosts of the neighbouring sprockets, so the cassette reads as a stack.
	for (int g = 1; g <= 3; g++) {
		float fg   = float(g);
		float rr   = cogR + fg * 0.022;
		float dG   = abs(length(qCog) - rr) - 0.0016;
		col += pB * (1.0 - aaStep(0.0, dG, softness)) * 0.05 / fg;
	}

	// -------------------------------------------------------------------- chain
	// Upper and lower spans plus the wraps. Link pitch is constant, so links
	// visibly travel rather than the span just glowing.
	float dSpanTop = sdSegment(p, ringC + vec2(0.0,  ringR), cogC + vec2(0.0,  cogR));
	float dSpanBot = sdSegment(p, ringC + vec2(0.0, -ringR), cogC + vec2(0.0, -cogR));
	float dWrapR   = abs(length(qRing) - ringR) + step(qRing.x, 0.0) * 0.0;
	float dWrapC   = abs(length(qCog)  - cogR);
	float wrapMaskR = step(qRing.x, 0.0);
	float wrapMaskC = step(0.0, qCog.x);
	float dChain = min(min(dSpanTop, dSpanBot),
	                   min(mix(1.0, dWrapR, wrapMaskR), mix(1.0, dWrapC, wrapMaskC)));

	// Link teeth marching along the chain path.
	float chainRun  = p.x * 6.0 + t * 26.0;
	float links     = 0.5 + 0.5 * sin(chainRun * 6.28318);
	float chainCore = 1.0 - aaStep(0.010, dChain, softness);
	float chainLink = 1.0 - aaStep(0.016, dChain, softness);
	col += mix(pB, pA, 0.5) * chainLink * chainAmount * 0.16;
	col += mix(pA, vec3(1.0), 0.30) * chainCore * chainAmount * (0.45 + links * 0.55)
	     * (0.5 + torque * 0.7);

	// ------------------------------------------------------- power / HR gauges
	// Outer arc: power. Fills clockwise from the bottom, like a head unit.
	float gaugeR   = 0.78;
	float dGauge   = abs(r - gaugeR) - 0.012;
	float gaugeArc = fract((a + 1.5708) / 6.28318 + 1.0);
	float filled   = 1.0 - aaStep(power, gaugeArc, softness);
	float track    = 1.0 - aaStep(0.0, dGauge, softness);
	col += pB * track * 0.06;
	col += mix(pA, vec3(1.0), 0.25) * track * filled * (0.65 + bAmp * 0.5);

	// Tick marks every 10%.
	float ticks = 1.0 - aaStep(0.04, abs(fract(gaugeArc * 10.0) - 0.5), softness);
	col += pA * track * ticks * 0.25;

	// Inner ring: heart rate, throbbing at a rate set by the HR input.
	float hrBeat = pow(0.5 + 0.5 * sin(TIME * (1.2 + heartRate * 3.4) * 6.28318), 6.0);
	float hrR    = 0.60 + hrBeat * 0.02 * heartRate;
	float dHR    = abs(r - hrR) - 0.004;
	col += mix(pB, pA, heartRate) * (1.0 - aaStep(0.0, dHR, softness))
	     * (0.25 + hrBeat * heartRate * 0.85);

	// Torque smear: a rotational blur streak trailing the power stroke.
	float smear = exp(-abs(sin((a - crank) * 0.5)) * 6.0)
	            * smoothstep(gaugeR * 0.95, ringR, r)
	            * torque * torqueBlur * 0.12;
	col += pA * smear;

	// HIGH -> edge-gated emission at the rim: metal glinting off the teeth.
	float glint = 0.5 + 0.5 * sin(a * 90.0 + t * 40.0);
	col += pA * (ringEdge + cogEdge) * glint * hAmp * highSparkle * wHigh * 0.55;

	// Effort vignette.
	float vig = 1.0 - dot(p, p) * (0.12 + si * 0.16 + bAmp * 0.08);
	col *= max(vig, 0.0);

	// Trails: max-blend against the decayed previous frame — cannot run away.
	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(col, prev), 1.0);
}
