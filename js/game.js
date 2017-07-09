class CAGame {
	constructor(length, width, height, rules){
		this.rules = rules;


		this.colors = {
			deadCell: new THREE.Color(0xff0000),
			deadCellAlpha: 0.1,
			liveCell: new THREE.Color(0x00ff00),
			liveCellAlpha: 1,
			selectedCell: new THREE.Color(0x0000ff),
			selectedCellAlpha: 0.5,
		};

		this.cellStore =  new CellularAutomataStore(length, width, height);
		this.controls = new Movement();

		this.centerOfScreen = new THREE.Vector2(0, 0);

		this.scene = new THREE.Scene();

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
		this.speed = .35;

		this.raycaster = new THREE.Raycaster();
		this.raycaster.params.Points.threshold = 0.15;

		// this.prevCell = null;
		// this.currentCell = null;

		this.lastCell = null;
		this.particles = null;
	}

	initCamera(near, far){
		const cam = new THREE.PerspectiveCamera( 90, (window.innerWidth / window.innerHeight), near, far );
		const pitch = new THREE.Object3D(); //vertical rotation of the camera view
		const yaw = new THREE.Object3D(); //horizontal rotation of the camera view
		pitch.add(cam);
		yaw.add(pitch);
		return {cam, pitch, yaw};
	}


	flipParticle(index){
		const prevState = this.particles.geometry.attributes.state.array[index];
		const offset = this.particles.geometry.attributes.offset.array[index];
		this.cellStore._flipCellState(offset);
		this.particles.geometry.attributes.state.array[index] = prevState ? 0 : 1;
		this.particles.geometry.attributes.state.needsUpdate = true;
	}


	colorParticleSelected(particleSystem, index, color, alpha){
		if (index == null) {debugger}
		const indexFactor = particleSystem.geometry.attributes.customColor.itemSize;
		const colorArr = particleSystem.geometry.attributes.customColor.array;
		colorArr[index * indexFactor] = color.r;
		colorArr[index * indexFactor + 1] = color.g;
		colorArr[index * indexFactor + 2] = color.b;
		particleSystem.geometry.attributes.customColor.needsUpdate = true;

		particleSystem.geometry.attributes.customAlpha.array[index] = alpha;
		particleSystem.geometry.attributes.customAlpha.needsUpdate = true;

	}

	nextIteration(){
		//TODO trigger rule resolution!
		for (let bit of this.cellStore.toCellArray()){
			// this.scene.getObjectByName(bit.offset).state = bit.state;
		}
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
		particleSystem.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
		particleSystem.addAttribute('customAlpha', new THREE.BufferAttribute(alpha, 1));
		particleSystem.addAttribute('offset', new THREE.BufferAttribute(offset, 1));
		particleSystem.addAttribute('state', new THREE.BufferAttribute(state, 1));
		//data zero'd out
		// this.cellStore.toCellArray().forEach(bit => {
		// 	const voxel = this.makeVoxel(bit.state);
		// 	voxel.name = bit.offset;
		// 	voxel.state = bit.state;
		// 	this.scene.add( voxel );
		// 	voxel.position.set(...this.cellStore._offsetToIndex(bit.offset));
		// });

		allCells.forEach((bit, index)=> {
			//bit.state, bit.offset
			const [x, y, z] = this.cellStore._offsetToIndex(bit.offset);
			positions[3 * index] = x;
			positions[3 * index + 1] = y;
			positions[3 * index + 2] = z;

			const colorFromState = bit.state ? this.colors.liveCell : this.colors.deadCell;
			colors[3 * index] = colorFromState.r;
			colors[3 * index + 1] = colorFromState.g;
			colors[3 * index + 2] = colorFromState.b;

			alpha[index] = bit.state ? this.colors.liveCellAlpha : this.colors.deadCellAlpha;

			offset[index] = bit.offset;

			state[index] = bit.state;

		});


		const particleMaterial = new THREE.ShaderMaterial({
				// vertexColors: THREE.VertexColors,
				vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
				transparent: true,
			});
		// const particleShaderMaterial = new THREE.ShaderMaterial();

		this.particles = new THREE.Points(particleSystem, particleMaterial);
		this.particles.name = 'particles';
		this.scene.add(this.particles);

		this.scene.background = new THREE.Color( 0xf0f0f0 )

		this.camera.yaw.translateZ(10);
		this.camera.yaw.translateX(-10);
		this.camera.yaw.rotation.y -= 5;
		this.animate();
	}




	animate(){
		requestAnimationFrame( this.animate.bind(this) );


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

		this.controls.signalStep
			? this.nextIteration()
			: null;

		if (this.controls.mouseMoved){
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
				const selected = intersected[0].object;
				this.colorParticleSelected(this.particles, currentCell, this.colors.selectedCell, this.colors.selectedCellAlpha);

				if (this.lastCell != null){
					//deselect old cell
					this.colorParticleSelected(this.particles, this.lastCell, ...this.getCellColors(this.prevCell));
				}

			} else {
				//on same cell as last render
				if (this.controls.justClicked){
					this.controls.justClicked = false; //burn click
					this.flipParticle(currentCell);
				}
			}
		} else {
			//not selecting anything
			//clear last cell
			if (this.lastCell != null){
				//deselect old cell
				this.colorParticleSelected(this.particles, this.lastCell, ...this.getCellColors(this.lastCell));
			}
		}
		//set to old cell
		// this.lastCell = currentCell;
		//
		// if (this.controls.isClicking && this.currentCell != null && this.currentCell !== this.prevCell){
		// 	this.flipParticle(this.currentCell);
		// 	this.colorParticleSelected(this.particles, this.currentCell, ...this.getCellColors(this.currentCell, true));
		// } else if (!this.controls.isClicking) {
		// 	// this.prevCell = null;
		// }
		// this.prevCell = this.currentCell;

	  this.renderer.render(this.scene, this.camera.cam);
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
