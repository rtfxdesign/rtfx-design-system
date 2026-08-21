/*{
	"DESCRIPTION": "Rotating spoke wheel luma mask. Spoke duty rides the bass, rotation rides the mids, edge hardness rides the highs, and the wheel breathes on the beat.",
	"CREDIT": "RT/FX",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator",
		"Masks"
	],
	"INPUTS": [
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Beat Pulse" },
		{ "NAME": "spokes", "TYPE": "float", "DEFAULT": 10.0, "MIN": 2.0, "MAX": 24.0, "LABEL": "Spokes" },
		{ "NAME": "rotRate", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 4.0, "LABEL": "Rotation Rate" },
		{ "NAME": "softness", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.2, "MAX": 2.0, "LABEL": "Edge Softness" },
		{ "NAME": "hubRadius", "TYPE": "float", "DEFAULT": 0.11, "MIN": 0.0, "MAX": 0.4, "LABEL": "Hub Radius" }
	]
}*/

void main() {
	vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / min(RENDERSIZE.x, RENDERSIZE.y);
	float r = length(uv);
	float a = atan(uv.y, uv.x);

	// rotation paced by the mids; whole spokes only so the wheel has no seam
	float rot = TIME * rotRate * (0.5 + mid * 1.7);
	float s = cos((a + rot) * floor(spokes + 0.5));

	// bass widens the spokes, highs harden their edges
	float th = mix(0.65, -0.35, bass);
	float spoke = smoothstep(th, th + mix(0.3, 0.06, high) * softness, s);

	// annulus keeps the mask off the extreme centre and corners
	float ann = smoothstep(0.1, 0.15, r) * smoothstep(0.96, 0.88, r);
	float hub = smoothstep(0.018, 0.006, abs(r - hubRadius)) * step(0.02, hubRadius);

	float m = spoke * ann * (0.75 + 0.25 * beat) + hub;
	gl_FragColor = vec4(vec3(clamp(m, 0.0, 1.0)), 1.0);
}
