class CAGame {
	constructor(length, width, height, rules){
		this.rules = rules;
		this.sliderVariables = {x: length, y: width, z: height};

		this.colors = {
			deadCell: new THREE.Color(0xed4e4e),
			deadCellAlpha: 0.5,
			deadCellAlphaHide: 0,
			liveCell: new THREE.Color(0x00ff00),
			liveCellAlpha: 1,
			selectedCell: new THREE.Color(0x0000ff),
			selectedCellAlpha: 0.6,
		};

		// this.cellStore =  new CellularAutomataStore(length, width, height);
		this.cellStore =  this.initCellStore(this.sliderVariables.x, this.sliderVariables.y, this.sliderVariables.z);
		this.controls = new Movement();

		this.centerOfScreen = new THREE.Vector2(0, 0);

		this.scene = new THREE.Scene();
		// this.scene.background = new THREE.Color(0xf0f0f0);
		this.scene.background = new THREE.Color(0xf9f9f9);

		this.camera = this.initCamera(0.1, 1000);
		this.scene.add(this.camera.yaw);


		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize( window.innerWidth, window.innerHeight );

		document.body.appendChild( this.renderer.domElement );

		window.addEventListener( 'resize', () => {
			this.camera.cam.aspect = window.innerWidth / window.innerHeight;
			this.camera.cam.updateProjectionMatrix(); //mandatory after changing aspect
			this.renderer.setSize( window.innerWidth, window.innerHeight );
		});

		this.degToRad = Math.PI / 180;
		this.pi2 = Math.Pi / 2;
		this.mouseSensitivityFactor = 0.1;
		this.speed = .33;

		this.raycaster = new THREE.Raycaster();
		this.raycaster.params.Points.threshold = 0.5;

		// this.prevCell = null;
		// this.currentCell = null;

		this.lastCell = null;
		this.particles = null;

		this.promisedAnimation = null;
		this.updateSignaled = false;
		this.isPlaying = false;
		this.animationId = null;
		this.tick = 0;
	}

	initCellStore(x, y, z){
		return new CellularAutomataStore(parseInt(x), parseInt(y), parseInt(z));
	}

	restartWithNewDimensions(x, y, z){
		console.log('restarted')
		this.sliderVariables.x = x;
		this.sliderVariables.y = y;
		this.sliderVariables.z = z;
		cancelAnimationFrame(this.animationId);

		this.cellStore = this.initCellStore(x, y, z);

		this.particles.geometry.vertices = [];
		this.particles.geometry.dispose();
		this.particles.material.dispose();
		this.scene.remove(this.particles);
		// this.particles.dispose();
		console.log('post animation cancel frame')
		this.init();
		console.log('post re-init')
	}

	initCamera(near, far){
		const cam = new THREE.PerspectiveCamera( 90, (window.innerWidth / window.innerHeight), near, far );
		const pitch = new THREE.Object3D(); //vertical rotation of the camera view
		const yaw = new THREE.Object3D(); //horizontal rotation of the camera view
		pitch.add(cam);
		yaw.add(pitch);
		return {cam, pitch, yaw};
	}

	swapCam(d){
		
	}




	flipParticle(index){
		//jul10 cellstore x, y, z here z, y, x
		const prevState = this.particles.geometry.attributes.state.array[index];
		const offset = this.particles.geometry.attributes.offset.array[index];
		console.log('from game.js', offset,...this.particles.geometry.attributes.position.array.slice(index*3, 3*index + 3), '---', ...this.cellStore._offsetToIndex(offset))
		this.cellStore.flipCellStateWithOffset(offset);
		this.particles.geometry.attributes.state.array[index] = prevState ? 0 : 1;
		this.particles.geometry.attributes.state.needsUpdate = true;
	}


	colorParticleSelected(particleSystem, index, color, alpha){
		const indexFactor = particleSystem.geometry.attributes.color.itemSize;
		const colorArr = particleSystem.geometry.attributes.color.array;
		colorArr[index * indexFactor] = color.r;
		colorArr[index * indexFactor + 1] = color.g;
		colorArr[index * indexFactor + 2] = color.b;
		particleSystem.geometry.attributes.color.needsUpdate = true;

		particleSystem.geometry.attributes.alpha.array[index] = alpha;
		particleSystem.geometry.attributes.alpha.needsUpdate = true;

	}


	init(){
		const allCells = this.cellStore.toCellArray();
		const nCells = allCells.length;

		const positions = new Float32Array(nCells * 3);
		const colors = new Float32Array(nCells * 3);
		const alpha = new Float32Array(nCells);
		const offset = new Float32Array(nCells);
		const state = new Float32Array(nCells);

		const particleSystem = new THREE.BufferGeometry();
		particleSystem.addAttribute('position', new THREE.BufferAttribute(positions, 3));
		particleSystem.addAttribute('color', new THREE.BufferAttribute(colors, 3));
		particleSystem.addAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
		particleSystem.addAttribute('offset', new THREE.BufferAttribute(offset, 1));
		particleSystem.addAttribute('state', new THREE.BufferAttribute(state, 1));


		allCells.forEach((bit, index)=> {
			//bit.state, bit.offset
			const [x, y, z] = this.cellStore._offsetToIndex(bit.offset);
			positions[3 * index] = 3 * x + Math.random();
			positions[3 * index + 1] = 3 * y + Math.random();
			positions[3 * index + 2] = 3 * z + Math.random();

			const colorFromState = bit.state ? this.colors.liveCell : this.colors.deadCell;
			colors[3 * index] = colorFromState.r;
			colors[3 * index + 1] = colorFromState.g;
			colors[3 * index + 2] = colorFromState.b;

			alpha[index] = bit.state ? this.colors.liveCellAlpha : this.colors.deadCellAlpha;

			offset[index] = bit.offset;

			state[index] = bit.state;

		});

		const uniforms = {
						texture: {value: new THREE.TextureLoader().load("images/circle.png")}
					};

		const particleMaterial = new THREE.ShaderMaterial({
				uniforms,
				vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
				transparent: true,
				depthTest: false,
				depthWrite: false
			});
		// const particleShaderMaterial = new THREE.ShaderMaterial();

		this.particles = new THREE.Points(particleSystem, particleMaterial);
		this.particles.name = 'particles';
		this.scene.add(this.particles);


		this.camera.yaw.translateZ(10);
		this.camera.yaw.translateX(-10);
		this.camera.yaw.rotation.y -= 5;
		this.animate();
	}

	hideDeadCells(){
		[this.colors.deadCellAlpha, this.colors.deadCellAlphaHide] = [this.colors.deadCellAlphaHide, this.colors.deadCellAlpha]
		const alpha = this.particles.geometry.attributes.alpha.array;
		this.particles.geometry.attributes.state.array.forEach((bit, index) =>{
			if (bit === 0){
				alpha[index] = this.colors.deadCellAlpha;
			}
		});
		this.particles.geometry.attributes.alpha.needsUpdate = true;
	}

	updateCells(){
		const colors = this.particles.geometry.attributes.color;
		const alpha = this.particles.geometry.attributes.alpha;
		const state = this.particles.geometry.attributes.state;
		const positions = this.particles.geometry.attributes.position;

		this.cellStore.toCellArray().forEach( (bit, index) => {
			const colorFromState = bit.state === 1 ? this.colors.liveCell : this.colors.deadCell;
			colors.array[3 * index] = colorFromState.r;
			colors.array[3 * index + 1] = colorFromState.g;
			colors.array[3 * index + 2] = colorFromState.b;
			colors.needsUpdate = true;

			alpha.array[index] = bit.state === 1 ? this.colors.liveCellAlpha : this.colors.deadCellAlpha;
			alpha.needsUpdate = true;
			state.array[index] = bit.state;
			state.needsUpdate = true;
		});
	}


	animate(){
		this.animationId = requestAnimationFrame( this.animate.bind(this) );

		if (this.controls.movingForward){
			this.camera.yaw.translateZ(-this.speed);
		} else if (this.controls.movingBackward){
			this.camera.yaw.translateZ(this.speed);
		}

		if (this.controls.strafeRight){
			this.camera.yaw.translateX(this.speed);
		} else if (this.controls.strafeLeft){
			this.camera.yaw.translateX(-this.speed);
		}

		if (this.controls.moveUp){
			this.camera.yaw.translateY(this.speed);
		} else if (this.controls.moveDown){
			this.camera.yaw.translateY(-this.speed);
		}


		this.controls.signalHideDead
			? (this.hideDeadCells(), this.controls.signalHideDead = false) //consume signal
			: null;

		if (this.controls.signalStep) {
			this.controls.signalStep = false;
			this.cellStore.nextIteration(this.rules).then(
				s => {
					this.updateCells();
				}
			);

		}

		if(this.controls.signalPlay && !this.promisedAnimation){
			this.controls.signalPlay = false;
			this.isPlaying = true;
			console.log('started')
			// this.promisedAnimation = setInterval( () =>{
			// 	this.cellStore.nextIteration(this.rules)
			// 								.then(s => this.updateCells());
			// }, 2500);
			const playAnimation = _ => {
				return this.cellStore.nextIteration(this.rules)
						 								 .then( _ => this.updateCells())
													 	 .then( _ => this.isPlaying ? playAnimation() : null);
			};
			this.promisedAnimation = playAnimation();
		} else if (this.controls.signalPlay && this.promisedAnimation){
			console.log('end')
			this.controls.signalPlay = false;
			this.isPlaying = false;
			// clearInterval(this.promisedAnimation);
			this.promisedAnimation = null;
		}


			if (this.controls.expand){
				this.controls.expand = false;
				this.moveAll(1.1);
			}
			if (this.controls.contract){
				this.controls.contract = false;
				this.moveAll(0.9);
			}




		if (this.controls.mouseMoved){
			this.controls.mouseMoved = false;
			this.camera.yaw.rotation.y -= this.mouseSensitivityFactor * this.controls.horizontalPan * this.degToRad;
			this.camera.pitch.rotation.x -= this.mouseSensitivityFactor * this.controls.verticalPan * this.degToRad;
		}




		this.raycaster.setFromCamera( this.centerOfScreen, this.camera.cam );
		const intersected = this.raycaster.intersectObject( this.particles );
		//update to selected color
		if (intersected.length > 0) {
			//get currentCell, color it selected color

			const currentCell = intersected[0].index;
			if (!(currentCell === this.lastCell)){
				//on new cell
				//selected new cell
				this.colorParticleSelected(this.particles, currentCell, this.colors.selectedCell, this.colors.selectedCellAlpha);
				if (this.lastCell != null){
					//deselect old cell
					this.colorParticleSelected(this.particles, this.lastCell, ...this.getCellColors(this.lastCell));
				}

			} else {
				//on same cell as last render
				if (this.controls.justClicked){
					//TODO laggy clicks
					this.controls.justClicked = false; //burn click
					this.flipParticle(currentCell);
					this.colorParticleSelected(this.particles, currentCell, ...this.getCellColors(currentCell));
				}
			}
			this.lastCell = currentCell;
		} else {
			//not selecting anything
			//clear last cell
			if (this.lastCell != null){
				//deselect old cell
				this.colorParticleSelected(this.particles, this.lastCell, ...this.getCellColors(this.lastCell));
				this.lastCell = null;
			}
		}

		// (++this.tick < 10 ? false : ((this.tick = 0), true) ) ? this.wiggleParticles() : null;
	  this.renderer.render(this.scene, this.camera.cam);
	}

	moveAll(int){
		const positions = this.particles.geometry.attributes.position.array;
		// debugger
		for(let index = 0; index < positions.byteLength; index++){
			positions[3 * index] *= int;
			positions[3 * index + 1] *= int;
			positions[3 * index + 2] *= int;
		}
		this.particles.geometry.attributes.position.needsUpdate = true;
	}

	wiggleParticles(){
		const positions = this.particles.geometry.attributes.position.array;
		const [rx, ry, rz] = [Math.random() > .5, Math.random() > .5, Math.random() > .5];

		for(let index = 0; index < positions.byteLength; index++){
			positions[3 * index] += rx ? -0.005 : 0.005;
			positions[3 * index + 1] += ry ? -0.005 : 0.005;
			positions[3 * index + 2] += rz ? -0.005 : 0.005;
		}
		this.particles.geometry.attributes.position.needsUpdate = true;

	}

	getCellColors(index, opposite = false){
		const cellState = this.particles.geometry.attributes.state.array[index];
		if (!opposite){
			const [color, alpha] = cellState
				? [this.colors.liveCell, this.colors.liveCellAlpha]
			 	: [this.colors.deadCell, this.colors.deadCellAlpha];
			return [color, alpha];
		} else{
			const [color, alpha] = cellState
				? [this.colors.deadCell, this.colors.deadCellAlpha]
				: [this.colors.liveCell, this.colors.liveCellAlpha];
			return [color, alpha];
		}
	}
}

// document.game.particles.geometry.attributes.offset.array.forEach( (o,i) => {
//     let p = document.game.particles.geometry.attributes.position.array;
//     console.log(i, o, p[i], p[i+1], p[i+2], '--', ...document.game.cellStore._offsetToIndex(o), document.game.cellStore._indexToOffset(p[i], p[i+1], p[i+2]))
// });
