/*{
	"DESCRIPTION": "Sphere Dots V2 - REVd audio-reactive rework of TinyTexel's 'oOoOoOo'. A sphere tiled with Fibonacci-distributed disks that open and close in a travelling spiral. Bass swells the disks and pushes the camera in, mid bends the spiral so bands of dots lag behind one another, high sharpens the disk edges at the silhouette, and both spin and spiral are beat-locked. Outputs a real alpha channel - the background is transparent, not black.",
	"CREDIT": "Original 'oOoOoOoOoOo' by TinyTexel, CC BY-SA 4.0. Spherical Fibonacci mapping by Keinert, Innmann, Saenger and Stamminger. Sphere projection maths by Inigo Quilez (MIT). REVd V2 audio rework by REVd Cycling - also CC BY-SA 4.0 under ShareAlike.",
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
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (dot swell)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (spiral lag)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (edge crisp)" },
		{ "NAME": "beatPunch", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Beat Punch" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "spinRate", "TYPE": "float", "DEFAULT": 1.0, "MIN": -5.0, "MAX": 5.0, "LABEL": "Spin Rate" },
		{ "NAME": "spiralRate", "TYPE": "float", "DEFAULT": 1.0, "MIN": -5.0, "MAX": 5.0, "LABEL": "Spiral Rate" },
		{ "NAME": "dotDensity", "TYPE": "float", "DEFAULT": 12.0, "MIN": 2.0, "MAX": 24.0, "LABEL": "Dot Density" },
		{ "NAME": "dotSize", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.2, "MAX": 3.0, "LABEL": "Dot Size" },
		{ "NAME": "tilt", "TYPE": "float", "DEFAULT": -0.3, "MIN": -0.5, "MAX": 0.5, "LABEL": "Camera Tilt" },
		{ "NAME": "distance", "TYPE": "float", "DEFAULT": -0.3, "MIN": -1.5, "MAX": 0.5, "LABEL": "Camera Distance" },
		{ "NAME": "bgLevel", "TYPE": "float", "DEFAULT": 0.014, "MIN": 0.0, "MAX": 0.2, "LABEL": "Background Level" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.02, 0.2, 1.0], "LABEL": "Dot Color" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.0, 0.0, 0.0, 1.0], "LABEL": "Dot Core" }
	]
}*/

// oOoOoOoOoOo by TinyTexel - Creative Commons Attribution-ShareAlike 4.0.
// Spherical Fibonacci Mapping: Keinert, Innmann, Saenger, Stamminger.
// Sphere-projection maths (c) 2014 Inigo Quilez, MIT.
// This rework is distributed under CC BY-SA 4.0 per the ShareAlike term.

#define PixelCount RENDERSIZE.xy
#define rsqrt inversesqrt
#define clamp01(x) clamp(x, 0.0, 1.0)

const float Pi   = 3.14159265359;
const float Pi05 = Pi * 0.5;
const float PI   = 3.1415926535897932384626433832795;
const float PHI  = 1.6180339887498948482045868343656;

// Audio terms, assigned in main before any call.
float gTime;
float gDotSize;
float gSeq;
float gMask;
float gCount;

float Pow2(float x) { return x * x; }
float Pow3(float x) { return x * x * x; }

float SqrLen(vec3 v) { return dot(v, v); }

vec3 GammaEncode(vec3 x) { return pow(max(x, 0.0), vec3(1.0 / 2.2)); }

float madfrac(float a, float b) { return a * b - floor(a * b); }
vec2  madfrac(vec2 a,  float b) { return a * b - floor(a * b); }

// The original named this `round`, which collides with the built-in round()
// in GLSL 1.30 and later.
float roundHalf(float n) {
	return (fract(n) < 0.5) ? floor(n) : ceil(n);
}

float Intersect_Ray_Sphere(vec3 rp, vec3 rd, vec3 sp, float sr2, out vec2 t) {
	rp -= sp;
	float a = dot(rd, rd);
	float b = 2.0 * dot(rp, rd);
	float c = dot(rp, rp) - sr2;
	float D = b * b - 4.0 * a * c;
	if (D < 0.0) { t = vec2(0.0); return 0.0; }
	float sqrtD = sqrt(D);
	t = (-b + vec2(-sqrtD, sqrtD)) / a * 0.5;
	if (c < 0.0) { t.xy = t.yx; }
	return (t.x > 0.0 || c < 0.0) ? 1.0 : -1.0;
}

float sf2id(vec3 p, float n) {
	float phi = min(atan(p.y, p.x), PI), cosTheta = p.z;

	float k  = max(2.0, floor(log(n * PI * sqrt(5.0) * (1.0 - cosTheta * cosTheta)) / log(PHI * PHI)));
	float Fk = pow(PHI, k) / sqrt(5.0);

	vec2 F = vec2(roundHalf(Fk), roundHalf(Fk * PHI));

	vec2 ka = -2.0 * F / n;
	vec2 kb = 2.0 * PI * madfrac(F + 1.0, PHI - 1.0) - 2.0 * PI * (PHI - 1.0);
	mat2 iB = mat2(ka.y, -ka.x, -kb.y, kb.x) / (ka.y * kb.x - ka.x * kb.y);

	vec2 c = floor(iB * vec2(phi, cosTheta - (1.0 - 1.0 / n)));
	float d = 8.0;
	float j = 0.0;

	for (int s = 0; s < 4; s++) {
		vec2 uv = vec2(float(s - 2 * (s / 2)), float(s / 2));

		float ct = dot(ka, uv + c) + (1.0 - 1.0 / n);
		ct = clamp(ct, -1.0, 1.0) * 2.0 - ct;

		float i  = floor(n * 0.5 - ct * n * 0.5);
		float ph = 2.0 * PI * madfrac(i, PHI - 1.0);
		ct = 1.0 - (2.0 * i + 1.0) / n;
		float sinTheta = sqrt(1.0 - ct * ct);

		vec3 q = vec3(cos(ph) * sinTheta, sin(ph) * sinTheta, ct);
		float sqd = dot(q - p, q - p);
		if (sqd < d) { d = sqd; j = i; }
	}
	return j;
}

vec3 id2sf(float i, float n) {
	float phi = 2.0 * PI * madfrac(i, PHI);
	float zi = 1.0 - (2.0 * i + 1.0) / n;
	float sinTheta = sqrt(1.0 - zi * zi);
	return vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, zi);
}

float ProjSphereArea(float rdz, vec3 p, float rr) {
	float zz = p.z * p.z;
	float ll = dot(p, p);
	return Pi * rdz * rdz * rr * rsqrt(abs(Pow3(rr - zz) / (rr - ll)));
}

vec4 ProjDisk(vec3 rd, vec3 p, vec3 n, float rr) {
	vec3 np0 = n * p.xyz;
	vec3 np1 = n * p.yzx;
	vec3 np2 = n * p.zxy;

	mat3 k_mat = mat3(vec3( np0.y + np0.z,  np2.x,          np1.x),
	                  vec3(-np2.y,          np1.y,         -np0.x - np0.z),
	                  vec3(-np1.z,         -np0.x - np0.y,  np2.z));

	vec3 u = k_mat * rd;
	vec3 k = u * k_mat;

	float nrd = dot(n, rd);
	float nrd_rr = nrd * rr;

	float v = dot(u, u) - nrd * nrd_rr;
	vec3  g = (k - n * nrd_rr) * 2.0;

	return vec4(g.xy, 0.0, v);
}

float SphX0(float d, float rr0, float rr1) { return 0.5 * (d + (rr0 - rr1) / d); }

vec3 EvalSceneCol(vec3 cpos, mat3 cam_mat, float focalLen, vec2 uv0) {
	vec3 cBG = bgLevel * vec3(0.9, 1.0, 1.2);

	vec2 uv2 = uv0 - PixelCount * 0.5;
	vec3 rdir0 = vec3(uv2, focalLen);

	float rdir0S = 0.5 * PixelCount.x;
	rdir0 /= rdir0S;

	vec3 rdir = normalize(cam_mat * rdir0);

	vec2 t;
	float hit = Intersect_Ray_Sphere(cpos, rdir, vec3(0.0), 1.0, t);
	if (hit <= 0.0) { return cBG; }

	vec3 pf = cpos + rdir * t.x;

	float rra = 0.0;
	vec3 p2;
	float rr;

	{
		float s = gCount;
		float n = 1024.0 * s;

		float id = sf2id(pf.xzy, n);
		p2 = id2sf(id, n).xzy;

		float u = id / n;

		// MID -> bends the spiral: bands of dots lag behind one another instead
		// of the whole sphere opening and closing as one shell.
		float lag = gSeq * sin(u * 20.0 - gTime * 3.0);

		float arg = (-u * 615.5 * 2.0 * s) + gTime + lag;

		rra = sin(arg);
		rra = mix(abs(rra), Pow2(rra), 0.75);

		// BASS -> disk radius.
		rr = 0.0025 / s * rra * gDotSize;
	}

	vec3 n2 = normalize(p2);

	if (SqrLen(pf - p2) > rr) { return cBG; }

	float d = length(p2);

	float x0 = SphX0(d, 1.0, rr);
	vec3 d0c = n2 * x0;
	float d0rr = 1.0 - x0 * x0;

	vec3 dp_c = (d0c - cpos) * cam_mat;
	vec3 dn_c = n2 * cam_mat;

	vec4 rp = ProjDisk(rdir0, dp_c, dn_c, d0rr);

	// HIGH -> disk edge sharpness.
	float cmask = clamp01(-rp.w * rsqrt(dot(rp.xy, rp.xy)) * rdir0S * gMask);

	float cmask2 = 0.0;
	{
		vec3 d1c = n2 * (x0 - 0.005);
		vec4 r2 = ProjDisk(rdir0, (d1c - cpos) * cam_mat, n2 * cam_mat, (1.0 - x0 * x0) * rra);
		cmask2 = clamp01(-r2.w * rsqrt(dot(r2.xy, r2.xy)) * rdir0S * gMask);
	}

	float A = ProjSphereArea(rdir0.z, dp_c, d0rr);
	A *= rdir0S * rdir0S;

	float NdV = abs(dot(dn_c, normalize(dp_c)));
	A *= NdV;
	A *= NdV;
	cmask *= clamp01((A - 2.0) * 0.125);

	return mix(cBG, mix(color1.rgb, color2.rgb, cmask2), cmask);
}

void main() {
	vec2 uvN = isf_FragNormCoord;

	// PASS 1: present the accumulated buffer, alpha included.
	if (PASSINDEX == 1) {
		gl_FragColor = IMG_NORM_PIXEL(bufA, uvN);
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

	// Radial band windows. On a centred sphere these read as: centre = the face
	// pointing at camera, rim = the silhouette edge.
	vec2  bandP = (gl_FragCoord.xy + gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;
	float rdw   = length(bandP) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rdw);
	float wMid  = smoothstep(0.08, 0.42, rdw) * (1.0 - smoothstep(0.58, 1.05, rdw));
	float wHigh = smoothstep(0.30, 0.80, rdw);

	float bWarp = bAmp * bassWarp * wBass + kick * 0.35;

	gTime    = r * spiralRate * mix(0.7, 1.3, si);
	gDotSize = dotSize * (1.0 + bWarp * 0.55);
	gSeq     = mAmp * midRipple * wMid * 1.5;
	gMask    = 0.5 * (1.0 + hAmp * highSparkle * wHigh * 1.8);
	gCount   = max(dotDensity, 2.0);

	// ---- camera ------------------------------------------------------------
	vec2 ang = vec2(0.0, Pi * tilt);
	ang.x += r * spinRate * 0.15 + bar * 0.03;

	float fov = Pi * 0.5;

	float sinPhi = sin(ang.x), cosPhi = cos(ang.x);
	float sinTheta = sin(ang.y), cosTheta = cos(ang.y);

	vec3 front = vec3(cosPhi * cosTheta, sinTheta, sinPhi * cosTheta);
	vec3 right = vec3(-sinPhi, 0.0, cosPhi);
	vec3 up    = cross(right, front);

	float focalLen = PixelCount.x * 0.5 * tan(Pi05 - fov * 0.5);
	mat3 cam_mat = mat3(right, up, front);

	// BASS -> camera pushes in toward the sphere.
	vec3 cpos = -cam_mat[2] * exp2(distance - bWarp * 0.12);
	cpos.y += 0.75;

	vec3 col = EvalSceneCol(cpos, cam_mat, focalLen, uvN * RENDERSIZE.xy);

	col *= mix(0.85, 1.20, si);

	vec3 outC = GammaEncode(clamp01(col));

	// The original derives alpha from luminance, so the background comes out
	// transparent rather than black. Preserved here, and carried through the
	// trail buffer, so the source composites straight over other layers.
	float alpha = clamp01(outC.r + outC.g + outC.b);

	vec4 prev = IMG_NORM_PIXEL(bufA, uvN) * clamp(trail, 0.0, 0.97);
	gl_FragColor = max(vec4(outC, alpha), prev);
}
