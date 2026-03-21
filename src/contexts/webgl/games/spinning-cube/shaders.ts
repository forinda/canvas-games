/** Vertex shader — transforms positions, passes color + normal to fragment. */
export const VERT_SRC = /* glsl */ `#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vNormal;
out vec3 vWorldPos;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = mat3(uModel) * aNormal; // transform normal to world space
    gl_Position = uProjection * uView * worldPos;
}
`;

/** Fragment shader — per-face color via normal, simple directional light. */
export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;   // normalized direction TO the light
uniform float uTime;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    // Per-face color derived from the normal direction
    vec3 baseColor = vec3(
        abs(norm.x) * 0.4 + 0.3,
        abs(norm.y) * 0.4 + 0.3,
        abs(norm.z) * 0.6 + 0.3
    );

    // Subtle hue shift over time
    baseColor.r += sin(uTime * 0.7) * 0.08;
    baseColor.g += sin(uTime * 1.1 + 1.0) * 0.08;
    baseColor.b += sin(uTime * 0.9 + 2.0) * 0.08;

    // Diffuse lighting
    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.25;
    float light = ambient + diffuse * 0.75;

    fragColor = vec4(baseColor * light, 1.0);
}
`;
