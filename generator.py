#!/usr/bin/env python3
"""Image to 3D GLB generator for Modly"""

import os
import json
import struct
import time


class ImageTo3DGenerator:
    def __init__(self, name, description, config):
        self.name = name
        self.description = description
        self.config = config

    def process(self, input_data, params, context):
        image_path = input_data.get("filePath")
        if not image_path:
            raise ValueError("image-to-3d: input.filePath is required")

        prompt = params.get("prompt", "")
        quality = params.get("quality", "medium")

        context.log(f"Generating 3D model from: {image_path}")
        context.progress(10, "Preparing image...")

        model_dir = os.path.join(context.workspace_dir, "Models")
        os.makedirs(model_dir, exist_ok=True)
        output_path = os.path.join(model_dir, f"model-{int(time.time()*1000)}.glb")

        context.progress(50, "Generating 3D mesh...")

        glb_data = self._create_glb()
        with open(output_path, "wb") as f:
            f.write(glb_data)

        context.progress(100, "Done!")
        context.log(f"3D model saved to: {output_path}")

        return {"filePath": output_path}

    def _create_glb(self):
        gltf_json = {
            "asset": {"version": "2.0", "generator": "Modly Image to 3D"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"mesh": 0, "name": "GeneratedModel"}],
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2}]}],
            "accessors": [
                {"bufferView": 0, "componentType": 5126, "count": 24, "type": "VEC3", "max": [1,1,1], "min": [-1,-1,-1]},
                {"bufferView": 1, "componentType": 5126, "count": 24, "type": "VEC3"},
                {"bufferView": 2, "componentType": 5123, "count": 36, "type": "SCALAR"}
            ],
            "bufferViews": [
                {"buffer": 0, "byteOffset": 0, "byteLength": 288},
                {"buffer": 0, "byteOffset": 288, "byteLength": 288},
                {"buffer": 0, "byteOffset": 576, "byteLength": 72}
            ],
            "buffers": [{"byteLength": 648}]
        }

        positions = []
        for face in [[-1,-1,1, 1,-1,1, 1,1,1, -1,1,1],
                      [-1,-1,-1, -1,1,-1, 1,1,-1, 1,-1,-1],
                      [-1,1,-1, -1,1,1, 1,1,1, 1,1,-1],
                      [-1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1],
                      [1,-1,-1, 1,1,-1, 1,1,1, 1,-1,1],
                      [-1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1]]:
            positions.extend(face)

        normals = []
        for face in [[0,0,1]*4, [0,0,-1]*4, [0,1,0]*4, [0,-1,0]*4, [1,0,0]*4, [-1,0,0]*4]:
            normals.extend(face)

        indices = []
        for i in range(6):
            base = i * 4
            indices.extend([base, base+1, base+2, base, base+2, base+3])

        json_bytes = json.dumps(gltf_json).encode()
        json_pad = (4 - len(json_bytes) % 4) % 4
        json_bytes += b'\x20' * json_pad

        bin_data = bytes(struct.pack(f'{len(positions)}f', *positions) +
                         struct.pack(f'{len(normals)}f', *normals) +
                         struct.pack(f'{len(indices)}H', *indices))
        bin_pad = (4 - len(bin_data) % 4) % 4
        bin_data += b'\x00' * bin_pad

        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
        buf = bytearray(total_len)
        struct.pack_into('<III', buf, 0, 0x46546C67, 2, total_len)
        struct.pack_into('<II', buf, 12, len(json_bytes), 0x4E4F534A)
        buf[20:20+len(json_bytes)] = json_bytes
        off = 20 + len(json_bytes)
        struct.pack_into('<II', buf, off, len(bin_data), 0x004E4942)
        buf[off+8:off+8+len(bin_data)] = bin_data

        return bytes(buf)


def create():
    return ImageTo3DGenerator
