import struct
import json

def read_glb_json(filepath):
    try:
        with open(filepath, "rb") as f:
            # GLB Header: magic (4 bytes), version (4 bytes), length (4 bytes)
            magic = f.read(4)
            version = struct.unpack("<I", f.read(4))[0]
            length = struct.unpack("<I", f.read(4))[0]
            
            # First chunk header: chunkLength (4 bytes), chunkType (4 bytes)
            chunk_length = struct.unpack("<I", f.read(4))[0]
            chunk_type = f.read(4)
            
            if chunk_type == b"JSON":
                json_data = f.read(chunk_length)
                return json.loads(json_data.decode("utf-8"))
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return None

running_gltf = read_glb_json("./assets/player/animation/Running.glb")

print("--- RUNNING ANIMATIONS ---")
if running_gltf:
    animations = running_gltf.get("animations", [])
    print(f"Total animations: {len(animations)}")
    for i, anim in enumerate(animations):
        channels = anim.get("channels", [])
        print(f"Animation {i} channels: {len(channels)}")
        if channels:
            # Check the target nodes in the first few channels
            sample_targets = []
            for channel in channels[:5]:
                target = channel.get("target", {})
                node_idx = target.get("node")
                path = target.get("path")
                # Get node name
                node_name = running_gltf["nodes"][node_idx].get("name", f"Node_{node_idx}")
                sample_targets.append(f"{node_name} ({path})")
            print("Sample targets:", sample_targets)
            
    # Check animation groups (gltf extension)
    extensions = running_gltf.get("extensionsUsed", [])
    print("Extensions used:", extensions)
else:
    print("Failed to parse Running.glb")
