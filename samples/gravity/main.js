//> A many-body simulation of gravitationally interacting masses,
//  designed as a potential DOM stress test. (This is why this is
//  implemented in DOM. Otherwise, this would be ideal for canvas2D.)

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

//> We allow the user to specify the number of particles to include in
//  the simulated universe using the `q=???` query parameter in the URL.
//  This bit of code tries to detect that using a pretty native but reliable approach.
let digits = null;
if (window.location.search.length > 0) {
    const digitsMatch = window.location.search.match(/\Wp=(\d*)/);
    if (digitsMatch !== null) {
        digits = +digitsMatch[1];
    }
}

//> Constants in the simulation are set here.
const PARTICLE_COUNT = digits || 500;
const PARTICLE_DIAMETER = 4;
const GRAV_CONST = 2000;

console.log(`Simulating with ${PARTICLE_COUNT} particles.`);

//> These functions are used to seed the initial particle positions
//  such that they're uniformly distributed within the browser viewport.
const randomWindowX = () => {
    return Math.random() * window.innerWidth;
}
const randomWindowY = () => {
    return Math.random() * window.innerHeight;
}

//> Class `ParticleSystem` models the many-body problem and behavior of gravitationally
//  attracted objects. It's in charge of computing incremental changes to positions and
//  velocities in every frame.
class ParticleSystem {

    constructor() {
        //> Each entry in `this.particles` is `[xPos, yPos, xVel, yVel, mass]`
        this.particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i ++) {
            this.particles.push([randomWindowX(), randomWindowY(), 0, 0, 1]);
        }
    }

    //> `step()` runs a single frame of the simulation, assuming the frame was
    //  `duration` seconds long.
    step(duration) {
        //> Memoize.
        const particles = this.particles;
        const len = particles.length;

        //> First, loop through all particles and update their velocities
        //  from our newly computed values of acceleration between particles.
        for (let i = 0; i < PARTICLE_COUNT; i ++) {
            const p = particles[i];
            let xAcc = 0;
            let yAcc = 0;
            for (let j = 0; j < len; j ++) {
                //> Particles should only be attracted to particles that aren't them.
                if (j !== i) {
                    const q = particles[j];

                    const xOffset = p[0] - q[0];
                    const yOffset = p[1] - q[1];

                    let sqDiagonal = (xOffset * xOffset) + (yOffset * yOffset);
                    if (sqDiagonal < PARTICLE_DIAMETER) {
                        sqDiagonal = PARTICLE_DIAMETER;
                    }
                    const diagonal = Math.sqrt(sqDiagonal)
                    //> This seems a little odd, but is a more performant, least
                    //  redundant to compute something mathematically equivalent
                    //  to the formula for gravitational acceleration.
                    const accel = ((GRAV_CONST / sqDiagonal) / diagonal) * q[4];

                    xAcc -= accel * xOffset;
                    yAcc -= accel * yOffset;
                }
            }
            p[2] += xAcc * duration;
            p[3] += yAcc * duration;
        }

        //> Now that we have new velocities, update positions from those velocities.
        for (let i = 0; i < PARTICLE_COUNT; i ++) {
            const part = particles[i];
            part[0] += part[2] * duration;
            part[1] += part[3] * duration;
        }
    }

}

//> The `Particle` function is a functional Torus component that renders an individual point,
//  given the data backing the point from the simulation. To minimize any overhead of `jdom` parsing
//  the HTML template at runtime, this functional component returns a dictionary representing the new DOM.
const Particle = pData => {
    const vel = ~~Math.sqrt((pData[2] * pData[2]) + (pData[3] * pData[3]));
    return {
        tag: 'div',
        attrs: {
            class: 'particle',
            style: {
                //> We use `transform` to position our particles on the page.
                transform: `translate(${pData[0]}px, ${pData[1]}px)`,
                //> Background color of these particles vary by their velocities.
                backgroundColor: `hsl(${vel > 240 ? 240 : vel}, 90%, 60%)`,
            },
        },
    }
}

//> The `Simulation` component represents all simulation state and the view that encapsulates it.
class Simulation extends StyledComponent {

    init() {
        this.system = new ParticleSystem();

        //> Create a function to be called at every animation frame, for a demo.
        let lastTime = new Date().getTime();
        const step = () => {
            const thisTime = new Date().getTime();
            this.system.step((thisTime - lastTime) / 1000);
            lastTime = thisTime;
            this.render();
            //> We use `requestAnimationFrame` to schedule re-renders every reasonable frame.
            requestAnimationFrame(step);
        }
        step();

        //> Bind event listeners.
        this.handleMousedown = this.handleMousedown.bind(this);
        this.handleMousemove = this.handleMousemove.bind(this);
        this.handleMouseup = this.handleMouseup.bind(this);
        this.trackingMouse = false;
    }

    //> When the user clicks the mouse down...
    handleMousedown(evt) {
        this.trackingMouse = true;
        this.system.particles.push([
            evt.clientX,
            evt.clientY,
            0,
            0,
            100,
        ]);
    }

    handleMousemove(evt) {
        if (this.trackingMouse) {
            const touchParticle = this.system.particles[PARTICLE_COUNT];
            touchParticle[0] = evt.clientX;
            touchParticle[1] = evt.clientY;
        }
    }

    handleMouseup() {
        this.trackingMouse = false;
        this.system.particles.pop();
    }

    styles() {
        return {
            'background': '#000',
            'height': '100vh',
            'width': '100vw',
            'position': 'absolute',
            'top': '0',
            'left': '0',
            'overflow': 'hidden',

            '.particle': {
                'height': PARTICLE_DIAMETER + 'px',
                'width': PARTICLE_DIAMETER + 'px',
                'border-radius': (PARTICLE_DIAMETER / 2) + 'px',
                'background': '#fff',
                'position': 'absolute',
                'top': '0',
                'left': '0',
            },
        }
    }

    compose() {
        // touch support is trivial, but not added for sake of simplicity
        return jdom`<div class="simulation"
            onmousedown="${this.handleMousedown}"
            onmousemove="${this.handleMousemove}"
            onmouseup="${this.handleMouseup}"
            >
            ${this.system.particles.map(p => Particle(p))}
        </div>`;
    }

}

class App extends StyledComponent {

    init() {
        this.simulation = new Simulation();
    }

    styles() {
        return {
            'footer': {
                'position': 'absolute',
                'right': '4px',
                'bottom': '4px',
                'color': '#ccc',
                'font-family': 'sans-serif',
                'font-size': '14px',
            },
            'a': {
                'color': '#ccc',
                'cursor': 'pointer',
                '&:hover': {
                    'opacity': '.7',
                },
            },
        }
    }

    compose() {
        return jdom`<main>
            ${this.simulation.node}
            <footer>
                DOM / JS stress test by
                <a href="https://linus.zone/now">Linus</a>,
                built with
                <a href="https://linus.zone/torus">Torus</a>,
            </footer>
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.margin = '0';

