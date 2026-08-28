# Body Action Explorer — v4.1

Rig camera/scale hotfix: the rigged body is normalized from its visible mesh bounds instead of the source armature bounds, preventing the body from appearing as a tiny speck.

# Body Action Explorer — v4 rigged pose preview

Adds a real skinned/rigged CC0 human model for pose movement while keeping the existing anatomy layers.

New pose examples include standing on one leg, squatting, arms up/out/forward, elbow bending, head turns, forward bends, and headstands. Pose phrases can be combined.

Important: the rigged outer body now moves as one skinned model. The detailed BodyParts3D anatomy meshes are still a separate static reference. Rigging those ~2,900 anatomy structures to the same skeleton is the remaining anatomy-animation step.

Rig source: UMRAM-Bilkent/supine-human-model `assets/human.glb`, derived from a Quaternius CC0 character.
