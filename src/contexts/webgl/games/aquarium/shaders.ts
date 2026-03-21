export const VERT_SRC = /* glsl */ `#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uTime;

out vec3 vNormal;
out vec3 vWorldPos;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = mat3(uModel) * aNormal;
    gl_Position = uProjection * uView * worldPos;
}
`;

export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;
uniform float uEmissive;
uniform float uTime;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.3;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 32.0);

    vec3 lit = uColor * (ambient + diffuse * 0.6) + vec3(1.0) * spec * 0.2;
    vec3 color = mix(lit, uColor, uEmissive);

    // Underwater caustic-like effect
    float caustic = sin(vWorldPos.x * 3.0 + uTime * 2.0) *
                    sin(vWorldPos.z * 3.0 + uTime * 1.5) * 0.08;
    color += vec3(caustic * 0.5, caustic * 0.8, caustic);

    // Depth tint (deeper = bluer)
    float depth = clamp(-vWorldPos.y / 8.0, 0.0, 1.0);
    color = mix(color, vec3(0.05, 0.15, 0.3), depth * 0.4);

    fragColor = vec4(color, 1.0);
}
`;
