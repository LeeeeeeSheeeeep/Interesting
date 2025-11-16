# Gladiator Arena (Interesting Game)

An unconventional, physics-driven HTML5 Canvas combat arena game featuring advanced segmented segment kinematics, Verlet integration whipping physics, and autonomic bot steering AI.

## Key Features

- **Segmented Verlet Chain Kinematics**: Body segments follow the head using strict distance constraints. Rotation values propagate down the chain dynamically to create fluid slithering and heavy tail whipping.
- **Dynamic Combat Classes**:
  - **Whip Snake**: A long, nimble fighter that gathers energy points to grow. Uses centrifugal hard turns and speed impulses to swing its heavy tail into opponent heads for critical damage.
  - **Venom Scorpion**: A compact, armored tank with pincers, walking legs, and a segment-arched stinger tail. Triggers a rapid stinger strike (extending outward via high-velocity sine waves) to inflict piercing poison damage.
- **Autonomic Bot AI**: Offline single-player bots running a multi-state steering machine (wandering for food, avoiding walls, evading threats, and actively aiming tail whip strikes when players are in target acquisition range).
- **Premium Neon Aesthetics**: A sleek dark mode dashboard styling with high-performance Canvas viewport scaling, floating glow particles, real-time rank lists, and smooth camera camera scrolling.

## Mathematical Mechanics & Kinematics

### 1. Verlet Distance Constraints
Body segments are locked to their preceding node using polar vector transforms:
$$x_i = x_{i-1} + \cos(\theta) \cdot d$$
$$y_i = y_{i-1} + \sin(\theta) \cdot d$$
Where $d$ is the rigid segment spacing, and $\theta$ is the angle of travel resolved from the displacement vector $\Delta x, \Delta y$.

### 2. Rotational Whipping Impulses
When a Whip Snake triggers its sweep, a angular force $F_{\text{whip}}$ is added to the tail-most segments:
$$\theta_i = \theta_{i-1} + (F_{\text{whip}} \cdot \text{direction} \cdot \frac{i}{N} \cdot k)$$
This causes the tail segments to accelerate radially outward, creating a realistic whipping curve that lashes out with high velocity.

### 3. Scorpion Stinger strike Wave
A stinger strike extends the final segment spacing using a sine wave function matching strike ticks:
$$\text{Spacing}_i = d \cdot (1.0 + \sin(\pi \cdot (1 - \frac{t_{\text{duration}}}{T_{\text{max}}})) \cdot 2.5)$$
Creating a spring-loaded thrust over the head toward the target vector.

## Getting Started

### Prerequisites

- A modern web browser with HTML5 Canvas and ES6 Javascript support.

### Running the game

1. Clone or download the repository files:
   ```bash
   git clone https://github.com/LeeeeeeSheeeeep/Interesting.git
   ```
2. Open `index.html` in any web browser to play. No installation, compilation, or server setup is required.

## Controls

- 🖱️ **Mouse Movement**: Steer the Gladiator's head direction.
- ⌨️ **Spacebar / Left-Click**: Trigger Whip/Sting Attack.
- 🔄 **Typos Reset**: If you make a sharp turn, centrifugal momentum will automatically carry the tail outwards.
