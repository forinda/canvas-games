export const VERT_SRC = /* glsl */ `#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vNormal;
out vec3 vWorldPos;
out vec3 vLocalPos;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vLocalPos = aPosition;
    vNormal = mat3(uModel) * aNormal;
    gl_Position = uProjection * uView * worldPos;
}
`;

export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;
in vec3 vLocalPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;
uniform float uEmissive;
uniform float uUsePlanetColor; // 1.0 = altitude-based coloring

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.15;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 24.0);

    vec3 baseColor = uColor;

    // Altitude-based coloring for the planet
    if (uUsePlanetColor > 0.5) {
        float altitude = length(vLocalPos);
        float seaLevel = 1.0;

        if (altitude < seaLevel - 0.02) {
            baseColor = vec3(0.1, 0.25, 0.6); // deep water
        } else if (altitude < seaLevel + 0.01) {
            baseColor = vec3(0.15, 0.4, 0.7); // shallow water
        } else if (altitude < seaLevel + 0.05) {
            baseColor = vec3(0.76, 0.7, 0.5); // sand/beach
        } else if (altitude < seaLevel + 0.15) {
            baseColor = vec3(0.2, 0.55, 0.15); // grass
        } else if (altitude < seaLevel + 0.3) {
            baseColor = vec3(0.35, 0.45, 0.25); // forest
        } else if (altitude < seaLevel + 0.45) {
            baseColor = vec3(0.45, 0.4, 0.35); // rock
        } else {
            baseColor = vec3(0.9, 0.92, 0.95); // snow
        }
    }

    vec3 lit = baseColor * (ambient + diffuse * 0.75) + vec3(1.0) * spec * 0.2;
    vec3 color = mix(lit, baseColor, uEmissive);

    // Atmosphere rim glow
    float rim = 1.0 - max(dot(norm, viewDir), 0.0);
    rim = pow(rim, 3.0) * 0.4;
    color += vec3(0.3, 0.5, 0.9) * rim;

    fragColor = vec4(color, 1.0);
}
`;
