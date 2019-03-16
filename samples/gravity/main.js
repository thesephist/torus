//> A renderer for a custom flavor of markdown, that renders
//  live, with every keystroke. I wrote the `Marked` component
//  to be integrated into my productivity apps (I'm rewriting my
//  notes and todo apps soon), but it also works well as a live
//  editor by itself.

//> Bootstrap the required globals from Torus, since we're not bundling
for (const exportedName in Torus) {
    window[exportedName] = Torus[exportedName];
}

const PARTICLE_COUNT = 500;
const PARTICLE_RADIUS = 3;
const GRAV_CONST = 5000;

const randomWindowX = () => {
    return Math.random() * window.innerWidth;
}

const randomWindowY = () => {
    return Math.random() * window.innerHeight;
}

class ParticleSystem {

    constructor() {
        // each entry is [xPos, yPos, xVel, yVel];
        this.particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i ++) {
            this.particles.push([randomWindowX(), randomWindowY(), 0, 0]);
        }
    }

    step(duration) {
        const particles = this.particles;

        for (let i = 0; i < PARTICLE_COUNT; i ++) {
            const p = particles[i];
            let xAcc = 0;
            let yAcc = 0;
            for (let j = 0; j < PARTICLE_COUNT; j ++) {
                if (j !== i) {
                    const q = particles[j];

                    const xOffset = p[0] - q[0];
                    const yOffset = p[1] - q[1];

                    let sqDiagonal = (xOffset * xOffset) + (yOffset * yOffset);
                    if (sqDiagonal < PARTICLE_RADIUS) {
                        sqDiagonal = PARTICLE_RADIUS;
                    }
                    const diagonal = Math.sqrt(sqDiagonal)
                    const accel = GRAV_CONST / sqDiagonal / diagonal;

                    xAcc -= accel * xOffset;
                    yAcc -= accel * yOffset;
                }
            }
            p[2] += xAcc * duration;
            p[3] += yAcc * duration;
        }

        // update positions
        for (let i = 0; i < PARTICLE_COUNT; i ++) {
            const part = particles[i];
            part[0] += part[2] * duration;
            part[1] += part[3] * duration;
        }
    }

    state() {
        return this.particles.slice();
    }

}

const Particle = (x, y) => {
    return {
        tag: 'div',
        attrs: {
            class: 'particle',
            style: {
                transform: `translate(${x}px, ${y}px)`,
            },
        },
    }
}

class Simulation extends StyledComponent {

    init() {
        this.system = new ParticleSystem();

        let lastTime = new Date().getTime();
        const step = () => {
            const thisTime = new Date().getTime();
            this.system.step((thisTime - lastTime) / 1000);
            lastTime = thisTime;
            this.render();
            requestAnimationFrame(step);
        }
        step();
    }

    styles() {
        return {
            'background': '#000',
            'height': '100vh',
            'width': '100vw',
            'position': 'absolute',
            'top': '0',
            'left': '0',

            '.particle': {
                'height': (PARTICLE_RADIUS * 2) + 'px',
                'width': (PARTICLE_RADIUS * 2) + 'px',
                'border-radius': PARTICLE_RADIUS + 'px',
                'background': '#fff',
                'position': 'absolute',
                'top': '0',
                'left': '0',
            },
        }
    }

    compose() {
        return jdom`<div class="simulation">
            ${this.system.state().map(p => Particle(p[0], p[1]))}
        </div>`;
    }

}

class App extends StyledComponent {

    init() {
        this.simulation = new Simulation();
    }

    compose() {
        return jdom`<main>
            ${this.simulation.node}
        </main>`;
    }

}

//> Create an instance of the app and mount it to the page DOM.
const app = new App();
document.body.appendChild(app.node);
document.body.style.margin = '0';

