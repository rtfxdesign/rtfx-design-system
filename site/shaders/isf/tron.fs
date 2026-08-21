/*{
  "DESCRIPTION": "REVD Grid Duel POV: a first-person, beat-driven ride down an elevated digital highway with flanking light cycles, luminous trail walls and a deep blue grid city.",
  "CREDIT": "Designed for REVD Cycling by Allen Grabo + ChatGPT; evolved from Allen's working REVD Grid Ride patch.",
  "CATEGORIES": ["Generator", "Audio Reactive", "Cycling", "Neon", "Raymarch", "POV"],
  "INPUTS": [
    {"NAME":"Beat_Transport", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":100000.0},
    {"NAME":"Beat_Pulse", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Audio_Level", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Audio_Low", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Audio_Mid", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Audio_High", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},

    {"NAME":"Ride_Stage", "TYPE":"float", "DEFAULT":1.0, "MIN":0.0, "MAX":3.0},
    {"NAME":"Travel_Per_Beat", "TYPE":"float", "DEFAULT":8.5, "MIN":0.0, "MAX":35.0},
    {"NAME":"Speed_Boost", "TYPE":"float", "DEFAULT":1.0, "MIN":0.25, "MAX":3.0},
    {"NAME":"POV_Height", "TYPE":"float", "DEFAULT":1.35, "MIN":0.55, "MAX":4.0},
    {"NAME":"Camera_FOV", "TYPE":"float", "DEFAULT":0.82, "MIN":0.40, "MAX":1.8},
    {"NAME":"Road_Width", "TYPE":"float", "DEFAULT":10.0, "MIN":5.0, "MAX":18.0},
    {"NAME":"Curve_Amount", "TYPE":"float", "DEFAULT":0.16, "MIN":0.0, "MAX":1.2},
    {"NAME":"Grid_Scale", "TYPE":"float", "DEFAULT":1.15, "MIN":0.35, "MAX":3.0},
    {"NAME":"Gate_Density", "TYPE":"float", "DEFAULT":0.62, "MIN":0.0, "MAX":2.5},

    {"NAME":"Rival_Separation", "TYPE":"float", "DEFAULT":3.8, "MIN":2.2, "MAX":7.0},
    {"NAME":"Rival_Distance", "TYPE":"float", "DEFAULT":7.2, "MIN":4.0, "MAX":15.0},
    {"NAME":"Trail_Wall_Height", "TYPE":"float", "DEFAULT":2.6, "MIN":0.4, "MAX":6.0},
    {"NAME":"Trail_Wall_Length", "TYPE":"float", "DEFAULT":1.0, "MIN":0.25, "MAX":2.0},
    {"NAME":"Cycle_Size", "TYPE":"float", "DEFAULT":1.0, "MIN":0.5, "MAX":1.8},
    {"NAME":"City_Density", "TYPE":"float", "DEFAULT":0.88, "MIN":0.0, "MAX":1.5},
    {"NAME":"City_Height", "TYPE":"float", "DEFAULT":1.0, "MIN":0.2, "MAX":2.0},
    {"NAME":"Palette_Shift", "TYPE":"float", "DEFAULT":0.0, "MIN":0.0, "MAX":1.0},
    {"NAME":"Base_Exposure", "TYPE":"float", "DEFAULT":1.48, "MIN":0.1, "MAX":5.0},

    {"NAME":"Bass_Road_Reactivity", "TYPE":"float", "DEFAULT":1.25, "MIN":0.0, "MAX":4.0},
    {"NAME":"Mid_City_Reactivity", "TYPE":"float", "DEFAULT":1.10, "MIN":0.0, "MAX":4.0},
    {"NAME":"High_Spark_Reactivity", "TYPE":"float", "DEFAULT":1.35, "MIN":0.0, "MAX":4.0},
    {"NAME":"Beat_Surge", "TYPE":"float", "DEFAULT":0.70, "MIN":0.0, "MAX":3.0},
    {"NAME":"Peak_Strobe", "TYPE":"float", "DEFAULT":0.18, "MIN":0.0, "MAX":1.5},
    {"NAME":"Audio_Response", "TYPE":"float", "DEFAULT":1.0, "MIN":0.25, "MAX":3.0}
  ]
}*/

#ifdef GL_ES
precision highp float;
#endif

#define PI 3.14159265359
#define TAU 6.28318530718

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat3(vec3 x) { return clamp(x, vec3(0.0), vec3(1.0)); }

float lowBand()  { return pow(sat(Audio_Low),  Audio_Response); }
float midBand()  { return pow(sat(Audio_Mid),  Audio_Response); }
float highBand() { return pow(sat(Audio_High), Audio_Response); }
float audioLevel(){ return pow(sat(Audio_Level),Audio_Response); }
float beatPulse(){ return sat(Beat_Pulse); }

float stageIntensity() {
    float s = clamp(Ride_Stage, 0.0, 3.0);
    if (s < 1.0) return mix(0.22, 0.55, s);
    if (s < 2.0) return mix(0.55, 1.0, s - 1.0);
    return mix(1.0, 0.20, s - 2.0);
}

float cooldownAmount() {
    return smoothstep(2.15, 3.0, clamp(Ride_Stage, 0.0, 3.0));
}

float peakAmount() {
    return smoothstep(1.45, 2.0, Ride_Stage) * (1.0 - smoothstep(2.0, 2.55, Ride_Stage));
}

float travelDistance() {
    float intensitySpeed = mix(0.78, 1.30, stageIntensity());
    return Beat_Transport * Travel_Per_Beat * Speed_Boost * intensitySpeed;
}

float hash11(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 21.0))) * 43758.5453123);
}

float noise3(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 57.0 + p.z * 113.0;
    return mix(
        mix(mix(hash11(n), hash11(n + 1.0), f.x),
            mix(hash11(n + 57.0), hash11(n + 58.0), f.x), f.y),
        mix(mix(hash11(n + 113.0), hash11(n + 114.0), f.x),
            mix(hash11(n + 170.0), hash11(n + 171.0), f.x), f.y), f.z);
}

float sdBox2(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdBox3(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sdCapsule3(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float sdTorusX(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.yz) - t.x, p.x);
    return length(q) - t.y;
}

float roadCurve(float z) {
    return Curve_Amount * (sin(z * 0.0062) * 11.0 + sin(z * 0.016) * 2.6);
}

float roadWave(float z) {
    return (0.10 + Curve_Amount * 0.16) * sin(z * 0.017) + 0.045 * sin(z * 0.055);
}

vec3 cyanColor() {
    return mix(vec3(0.00, 0.82, 1.00), vec3(0.08, 0.50, 1.00), Palette_Shift);
}

vec3 orangeColor() {
    return mix(vec3(1.00, 0.23, 0.015), vec3(1.00, 0.04, 0.58), Palette_Shift);
}

vec3 whiteGrid() {
    return mix(vec3(0.82, 0.96, 1.00), vec3(0.72, 0.86, 1.00), cooldownAmount());
}

vec3 violetColor() {
    return mix(vec3(0.30, 0.04, 0.88), vec3(0.00, 0.52, 1.00), cooldownAmount());
}

// Material IDs:
// 1 road slab, 2 lane rails, 3 energy gates, 4 rival cycles, 5 trail walls.
float mapRoad(vec3 p, out vec2 id) {
    float roadY = -1.55 - roadWave(p.z);
    id = floor(p.xz * vec2(Grid_Scale * 0.65, Grid_Scale * 0.28));
    float slab = abs(p.y - roadY) - 0.035;
    return max(slab, abs(p.x) - Road_Width);
}

float railTube(vec3 p, float xPos, float radius) {
    float roadY = -1.55 - roadWave(p.z);
    return length(vec2(p.x - xPos, p.y - roadY - 0.06)) - radius;
}

float mapLaneRails(vec3 p, out vec2 id) {
    float bass = lowBand() * Bass_Road_Reactivity;
    float rEdge = 0.055 + bass * 0.016 + beatPulse() * 0.010;
    float rCenter = 0.040 + bass * 0.010;

    float dLeft = railTube(p, -Road_Width, rEdge);
    float dRight = railTube(p, Road_Width, rEdge);
    float dCenterL = railTube(p, -0.58, rCenter);
    float dCenterR = railTube(p, 0.58, rCenter);

    float d = dLeft;
    id = vec2(0.0, 0.0);
    if (dRight < d) { d = dRight; id = vec2(1.0, 0.0); }
    if (dCenterL < d) { d = dCenterL; id = vec2(0.5, 1.0); }
    if (dCenterR < d) { d = dCenterR; id = vec2(0.5, 1.0); }
    return d;
}

float mapGate(vec3 p, out vec2 id) {
    float intensity = stageIntensity();
    float density = max(Gate_Density, 0.001);
    float spacing = mix(70.0, 23.0, sat(density / 2.5));
    spacing *= mix(1.18, 0.88, intensity);

    float gateCell = floor((p.z + spacing * 0.5) / spacing);
    float localZ = mod(p.z + spacing * 0.5, spacing) - spacing * 0.5;
    float roadY = -1.55 - roadWave(p.z);
    float centerY = roadY + 3.15;

    vec2 q = vec2(p.x, p.y - centerY);
    vec2 outerSize = vec2(Road_Width + 1.45, 4.70);
    float thickness = 0.11 + midBand() * 0.06 + beatPulse() * 0.028;
    float outer = sdBox2(q, outerSize);
    float inner = sdBox2(q, outerSize - vec2(thickness));
    float frame = max(outer, -inner);
    frame = max(frame, abs(localZ) - (0.055 + intensity * 0.030));

    // Tall central spine, echoing the distant elevated Grid highway.
    float spine = sdBox3(vec3(p.x, p.y - centerY - 0.45, localZ),
                         vec3(0.045 + midBand() * 0.025, 4.0, 0.07));
    spine += mix(0.24, -0.01, smoothstep(0.55, 0.95, intensity));

    id.x = hash11(gateCell * 7.13);
    id.y = mod(gateCell, 2.0);
    return min(frame, spine);
}

float cycleShape(vec3 q) {
    float s = max(Cycle_Size, 0.05);
    q /= s;

    float rearWheel = sdTorusX(q - vec3(0.0, 0.0, -1.02), vec2(0.72, 0.095));
    float frontWheel = sdTorusX(q - vec3(0.0, 0.0, 1.06), vec2(0.72, 0.095));
    float wheelCoreRear = sdTorusX(q - vec3(0.0, 0.0, -1.02), vec2(0.48, 0.055));
    float wheelCoreFront = sdTorusX(q - vec3(0.0, 0.0, 1.06), vec2(0.48, 0.055));

    float body = sdCapsule3(q, vec3(0.0, 0.10, -0.82), vec3(0.0, 0.24, 0.82), 0.34);
    float nose = sdBox3(q - vec3(0.0, 0.12, 0.92), vec3(0.34, 0.23, 0.48));
    float rider = sdCapsule3(q, vec3(0.0, 0.30, -0.16), vec3(0.0, 0.92, -0.36), 0.22);
    float canopy = sdCapsule3(q, vec3(0.0, 0.55, -0.34), vec3(0.0, 0.82, -0.52), 0.17);

    float d = min(min(rearWheel, frontWheel), min(wheelCoreRear, wheelCoreFront));
    d = min(d, min(body, nose));
    d = min(d, min(rider, canopy));
    return d * s;
}

float mapRivalCycles(vec3 p, out vec2 id) {
    float travel = travelDistance();
    float localZ = p.z + travel;
    float roadY = -1.55 - roadWave(p.z);
    float intensity = stageIntensity();

    float sway = sin(Beat_Transport * 0.19) * 0.18 * intensity;
    float leftZ = Rival_Distance + sin(Beat_Transport * 0.13) * 0.35;
    float rightZ = Rival_Distance + 0.65 + cos(Beat_Transport * 0.16) * 0.32;

    vec3 qLeft = vec3(p.x + Rival_Separation + sway,
                      p.y - roadY - 0.76 * Cycle_Size,
                      localZ - leftZ);
    vec3 qRight = vec3(p.x - Rival_Separation + sway,
                       p.y - roadY - 0.76 * Cycle_Size,
                       localZ - rightZ);

    float dLeft = cycleShape(qLeft);
    float dRight = cycleShape(qRight);
    if (dLeft < dRight) {
        id = vec2(0.0, 0.0);
        return dLeft;
    }
    id = vec2(1.0, 0.0);
    return dRight;
}

float wallShape(vec3 p, float side, float rivalZ) {
    float travel = travelDistance();
    float localZ = p.z + travel;
    float roadY = -1.55 - roadWave(p.z);
    float halfLength = max(2.0, rivalZ * 0.58 * Trail_Wall_Length);
    float centerZ = rivalZ - halfLength + 0.35;
    float thickness = 0.028 + lowBand() * 0.018 + beatPulse() * 0.012;

    vec3 q = vec3(p.x - side * Rival_Separation,
                  p.y - roadY - Trail_Wall_Height * 0.50,
                  localZ - centerZ);
    float wall = sdBox3(q, vec3(thickness, Trail_Wall_Height * 0.50, halfLength));

    // Ground ribbon under each cycle, reflecting the vertical wall.
    vec3 qr = vec3(p.x - side * Rival_Separation,
                   p.y - roadY - 0.025,
                   localZ - centerZ);
    float ribbon = sdBox3(qr, vec3(0.12 + highBand() * 0.05, 0.020, halfLength));
    return min(wall, ribbon);
}

float mapTrailWalls(vec3 p, out vec2 id) {
    float leftZ = Rival_Distance + sin(Beat_Transport * 0.13) * 0.35;
    float rightZ = Rival_Distance + 0.65 + cos(Beat_Transport * 0.16) * 0.32;
    float dLeft = wallShape(p, -1.0, leftZ);
    float dRight = wallShape(p, 1.0, rightZ);
    if (dLeft < dRight) {
        id = vec2(0.0, 0.0);
        return dLeft;
    }
    id = vec2(1.0, 0.0);
    return dRight;
}

vec2 mapScene(vec3 worldP, out vec2 id) {
    vec3 p = worldP;
    p.x -= roadCurve(p.z);

    vec2 best = vec2(1e6, 0.0);
    vec2 localId = vec2(0.0);

    float road = mapRoad(p, localId);
    if (road < best.x) { best = vec2(road, 1.0); id = localId; }

    float rails = mapLaneRails(p, localId);
    if (rails < best.x) { best = vec2(rails, 2.0); id = localId; }

    float gate = mapGate(p, localId);
    if (gate < best.x) { best = vec2(gate, 3.0); id = localId; }

    float cycles = mapRivalCycles(p, localId);
    if (cycles < best.x) { best = vec2(cycles, 4.0); id = localId; }

    float walls = mapTrailWalls(p, localId);
    if (walls < best.x) { best = vec2(walls, 5.0); id = localId; }

    return best;
}

vec2 castRay(vec3 ro, vec3 rd, out vec2 id) {
    const float FAR_CLIP = 230.0;
    float t = 0.0;
    id = vec2(0.0);

    for (int i = 0; i < 220; ++i) {
        if (t > FAR_CLIP) break;
        vec3 p = ro + rd * t;
        vec2 h = mapScene(p, id);
        float eps = max(0.0008, t * 0.0010);
        if (abs(h.x) < eps) return vec2(t, h.y);
        t += max(h.x * (t < 10.0 ? 0.44 : 0.78), 0.002);
    }
    return vec2(FAR_CLIP, 0.0);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    vec2 dummy;
    float d = mapScene(p, dummy).x;
    return normalize(vec3(
        mapScene(p + e.xyy, dummy).x - d,
        mapScene(p + e.yxy, dummy).x - d,
        mapScene(p + e.yyx, dummy).x - d));
}

float cityLayer(vec2 uv, float layer, out float windows) {
    float scale = mix(11.0, 32.0, layer) * max(City_Density, 0.001);
    float x = (uv.x + 2.4) * scale;
    float cell = floor(x);
    float fx = fract(x) - 0.5;
    float rnd = hash11(cell * (3.17 + layer * 4.1));
    float width = mix(0.20, 0.43, hash11(cell * 7.31 + layer));
    float height = (0.16 + rnd * 0.48) * City_Height * mix(0.55, 1.0, layer);
    float horizon = -0.02 + layer * 0.035;

    float xMask = 1.0 - smoothstep(width, width + 0.035, abs(fx));
    float yMask = smoothstep(horizon - 0.10, horizon - 0.02, uv.y) *
                  (1.0 - smoothstep(horizon + height, horizon + height + 0.025, uv.y));
    float building = xMask * yMask;

    vec2 winGrid = fract(vec2(fx * 12.0 + 0.5, (uv.y - horizon) * 38.0));
    float win = step(0.73, hash21(vec2(cell, floor((uv.y - horizon) * 38.0)) + layer * 9.0));
    win *= step(0.18, winGrid.x) * step(winGrid.x, 0.82) * step(0.18, winGrid.y) * step(winGrid.y, 0.82);
    windows = building * win;
    return building;
}

vec3 citySky(vec2 uv, vec3 rd) {
    float intensity = stageIntensity();
    float horizonGlow = pow(max(0.0, 1.0 - abs(rd.y + 0.015) * 3.1), 4.0);
    vec3 sky = vec3(0.002, 0.010, 0.030);
    sky += vec3(0.00, 0.08, 0.24) * horizonGlow * (0.55 + intensity * 0.45);

    float w0, w1, w2;
    float b0 = cityLayer(uv, 0.22, w0);
    float b1 = cityLayer(uv, 0.56, w1);
    float b2 = cityLayer(uv, 0.92, w2);

    sky += vec3(0.002, 0.020, 0.055) * b0;
    sky += vec3(0.003, 0.035, 0.095) * b1;
    sky += vec3(0.004, 0.055, 0.140) * b2;

    float windowEnergy = (w0 * 0.35 + w1 * 0.55 + w2) * (0.22 + midBand() * Mid_City_Reactivity * 1.4);
    sky += cyanColor() * windowEnergy;

    // Central city spine and converging vertical roadway lights.
    float spineX = abs(uv.x);
    float spine = (1.0 - smoothstep(0.012, 0.026, spineX)) *
                  smoothstep(-0.08, 0.02, uv.y) *
                  (1.0 - smoothstep(0.58 * City_Height, 0.82 * City_Height, uv.y));
    float towerBody = (1.0 - smoothstep(0.055, 0.09, spineX)) *
                      smoothstep(-0.05, 0.02, uv.y) *
                      (1.0 - smoothstep(0.40 * City_Height, 0.62 * City_Height, uv.y));
    sky += vec3(0.002, 0.018, 0.055) * towerBody;
    sky += whiteGrid() * spine * (1.4 + midBand() * 2.2 + beatPulse());

    float starNoise = noise3(vec3(uv.x * 120.0, uv.y * 120.0, Beat_Transport * 0.11));
    float stars = smoothstep(0.972 - highBand() * 0.028, 1.0, pow(starNoise, 3.0));
    sky += vec3(stars) * (0.08 + highBand() * High_Spark_Reactivity * 0.95);

    return sky;
}

float roadGridPattern(vec3 pos) {
    float scale = max(Grid_Scale, 0.05);
    vec2 f = abs(fract(pos.xz * vec2(0.62 * scale, 0.24 * scale)) - 0.5);
    float gx = smoothstep(0.465, 0.500, f.x);
    float gz = smoothstep(0.465, 0.500, f.y);
    return max(gx, gz);
}

vec3 materialColor(float material, vec2 id, vec3 pos) {
    float bass = lowBand() * Bass_Road_Reactivity;
    float mids = midBand() * Mid_City_Reactivity;
    float highs = highBand() * High_Spark_Reactivity;
    float intensity = stageIntensity();

    if (material < 1.5) {
        float grid = roadGridPattern(pos);
        float centerGlow = exp(-abs(abs(pos.x) - 0.58) * 18.0);
        float leftReflect = exp(-abs(pos.x + Rival_Separation) * 0.55);
        float rightReflect = exp(-abs(pos.x - Rival_Separation) * 0.55);

        vec3 road = vec3(0.0015, 0.005, 0.014);
        road += cyanColor() * grid * (0.18 + bass * 0.72 + beatPulse() * 0.18);
        road += whiteGrid() * centerGlow * (0.45 + bass * 0.55);
        road += orangeColor() * leftReflect * 0.055;
        road += cyanColor() * rightReflect * 0.065;
        return road;
    }

    if (material < 2.5) {
        vec3 rail = id.x < 0.25 ? orangeColor() : (id.x > 0.75 ? cyanColor() : whiteGrid());
        return rail * (5.8 + bass * 4.5 + beatPulse() * Beat_Surge * 2.2);
    }

    if (material < 3.5) {
        vec3 gate = mix(cyanColor(), orangeColor(), step(0.5, id.y));
        gate = mix(gate, whiteGrid(), 0.26 + id.x * 0.18);
        return gate * (3.8 + mids * 7.0 + beatPulse() * Beat_Surge * 2.8);
    }

    if (material < 4.5) {
        vec3 cycle = mix(orangeColor(), cyanColor(), id.x);
        return mix(cycle, whiteGrid(), 0.14 + highs * 0.18) *
               (8.5 + mids * 5.0 + highs * 8.0 + beatPulse() * 3.5);
    }

    vec3 wall = mix(orangeColor(), cyanColor(), id.x);
    return wall * (12.0 + bass * 8.0 + highs * 11.0 + beatPulse() * Beat_Surge * 5.0);
}

vec3 renderScene(vec3 ro, vec3 rd, vec2 uv) {
    vec2 id;
    vec2 hit = castRay(ro, rd, id);
    vec3 sky = citySky(uv, rd);

    if (hit.y < 0.5) return sky;

    vec3 pos = ro + rd * hit.x;
    vec3 nor = calcNormal(pos);
    vec3 lightDir = normalize(vec3(-0.6, 1.0, -0.35));
    float diffuse = max(0.16, dot(nor, lightDir));
    float rim = pow(1.0 - max(0.0, dot(nor, -rd)), 2.3);

    vec3 emission = materialColor(hit.y, id, pos);
    vec3 lit = emission * (0.70 + diffuse * 0.40 + rim * 0.92);

    float fog = 1.0 - exp(-hit.x * (0.0058 - stageIntensity() * 0.0014));
    vec3 fogColor = vec3(0.00, 0.035, 0.12) + cyanColor() * 0.018;
    return mix(lit, sky + fogColor, sat(fog));
}

void camera(out vec3 ro, out vec3 rd, vec2 uv) {
    float travel = travelDistance();
    float curve = roadCurve(-travel);
    float curveAhead = roadCurve(-travel - 3.2);
    float roadY = -1.55 - roadWave(-travel);

    float cadence = fract(Beat_Transport);
    float pedalBob = sin(cadence * TAU * 2.0) * 0.025 * stageIntensity();
    float bassLift = lowBand() * Bass_Road_Reactivity * 0.10;
    float beatKick = sin(cadence * PI) * beatPulse() * Beat_Surge * 0.10;
    float lean = (curveAhead - curve) * 0.10;
    float riderSway = sin(Beat_Transport * TAU * 0.25) * 0.035 * stageIntensity();

    ro = vec3(curve + lean + riderSway,
              roadY + POV_Height + pedalBob + bassLift + beatKick,
              -travel);

    float dynamicFov = Camera_FOV * mix(0.96, 1.08, stageIntensity());
    vec3 lookAt = vec3(
        curveAhead + uv.x * dynamicFov,
        roadY + 0.92 - uv.y * dynamicFov,
        -travel - 3.4);

    rd = normalize(ro - lookAt);
}

void main() {
    vec2 fragCoord = isf_FragNormCoord.xy * RENDERSIZE.xy;
    vec2 uv = (-RENDERSIZE.xy + 2.0 * fragCoord) / max(RENDERSIZE.y, 1.0);

    vec3 ro;
    vec3 rd;
    camera(ro, rd, uv);

    vec3 col = renderScene(ro, rd, uv);
    float intensity = stageIntensity();
    float peakFlash = peakAmount() * beatPulse() * Peak_Strobe;
    float exposure = Base_Exposure *
        (0.80 + intensity * 0.34 + audioLevel() * 0.24 + beatPulse() * Beat_Surge * 0.10 + peakFlash);
    col = max(col * exposure, vec3(0.0));

    gl_FragColor = vec4(col, 1.0);
}
