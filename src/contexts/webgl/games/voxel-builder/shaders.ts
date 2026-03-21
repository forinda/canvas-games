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
uniform float uEmissive;
uniform float uAlpha;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.25;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 24.0);

    // Edge darkening for voxel look
    vec3 absNorm = abs(norm);
    float edgeFactor = 1.0 - max(absNorm.x, max(absNorm.y, absNorm.z)) * 0.1;

    vec3 lit = uColor * (ambient + diffuse * 0.65) * edgeFactor + vec3(1.0) * spec * 0.15;
    vec3 color = mix(lit, uColor, uEmissive);

    fragColor = vec4(color, uAlpha);
}
`;
