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
uniform float uFogNear;
uniform float uFogFar;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    // Diffuse + ambient
    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.2;
    float light = ambient + diffuse * 0.7;

    // Specular
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 24.0);

    vec3 litColor = uColor * light + vec3(1.0) * spec * 0.15;

    // Linear fog
    float dist = length(uCameraPos - vWorldPos);
    float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    vec3 fogColor = vec3(0.55, 0.7, 0.85);

    fragColor = vec4(mix(litColor, fogColor, fog), 1.0);
}
`;
