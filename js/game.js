class CAGame {
	constructor(length, width, height, rules){
		this.rules = rules;


		this.colors = {
			deadCell: new THREE.Color(0xff0000),
			liveCell: new THREE.Color(0x00ff00),
			selectedCell: new THREE.Color(0x0000ff)
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
		// this.raycaster = new THREE.Raycaster(
		// 	new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 3, 10 );
		// this.raycaster.linePrecision = 3;


		this.particles = null;
	}

	updateDimensions(newX, newY, newZ){
		//new slider values
	}

	initCamera(near, far){
		const cam = new THREE.PerspectiveCamera( 75, (window.innerWidth / window.innerHeight), near, far );
		const pitch = new THREE.Object3D(); //vertical rotation of the camera view
		const yaw = new THREE.Object3D(); //horizontal rotation of the camera view
		pitch.add(cam);
		yaw.add(pitch);
		return {cam, pitch, yaw};
	}

	// makeVoxel(state){
	// 	// state 1 or 0
	// 	const color = state ? this.liveCellColor : this.deadCellColor;
	// 	const box = new THREE.BoxGeometry( 1, 1, 1 );
	// 	const wires = new THREE.WireframeGeometry( box );
	// 	const material = new THREE.LineBasicMaterial( { color: color, linewidth: 2 } );
	//
	// 	const voxel = new THREE.LineSegments(wires, material);
	// 	voxel.material.depthTest = false;
	// 	voxel.material.transparent = true;
	// 	return voxel;
	// }


	// flipVoxel(name){
	// 	this.cellStore._flipCellState(parseInt(name));
	// 	const voxel = this.scene.getObjectByName(name);
	// 	voxel.state = voxel.state ? 0 : 1;  //swap
	// 	voxel.material.color = voxel.state
	// 		? this.liveCellColor
	// 		: this.deadCellColor
	// }

	// resetPreviousSelectedCell(name){
	// 	if (name){
	// 		const prevSelected = this.scene.getObjectByName(name);
	// 		prevSelected.material.color = prevSelected.state
	// 			? this.liveCellColor
	// 			: this.deadCellColor
	// 	}
	// }


	nextIteration(){
		//TODO trigger rule resolution!
		for (let bit of this.cellStore.toCellArray()){
			this.scene.getObjectByName(bit.offset).state = bit.state;
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
		particleSystem.addAttribute('color', new THREE.BufferAttribute(colors, 3));
		particleSystem.addAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
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

			alpha[index] = bit.state ? 1 : .5;

			offset[index] = bit.offset;

			state[index] = bit.state;

		});

		const particleMaterial = new THREE.PointsMaterial({vertexColors: THREE.VertexColors});
		// const particleShaderMaterial = new THREE.ShaderMaterial();

		this.particles = new THREE.Points(particleSystem, particleMaterial);
		this.scene.add(this.particles);

		this.scene.background = new THREE.Color( 0xf0f0f0 )


		this.camera.yaw.translateZ(10);
		this.camera.yaw.translateX(-10);

		this.animate();
	}




	animate(){
		requestAnimationFrame( this.animate.bind(this) );


		// if (this.controls.canMove){
		if (this.controls.movingForward){
			this.camera.yaw.translateZ(-this.speed);
		} else if (this.controls.movingBackward){
			this.camera.yaw.translateZ(this.speed);
		}
		// if (this.controls.movingForward){
		// 	this.camera.cam.position.z -= this.speed;
		// } else if (this.controls.movingBackward){
		// 	this.camera.cam.position.z += this.speed;
		// }


		if (this.controls.strafeRight){
			this.camera.yaw.translateX(this.speed);
		} else if (this.controls.strafeLeft){
			this.camera.yaw.translateX(-this.speed);
		}
		// if (this.controls.strafeRight){
		// 	this.camera.cam.position.x += this.speed;
		// } else if (this.controls.strafeLeft){
		// 	this.camera.cam.position.x -= this.speed;
		// }



		if (this.controls.moveUp){
			this.camera.yaw.translateY(this.speed);
		} else if (this.controls.moveDown){
			this.camera.yaw.translateY(-this.speed);
		}
		// if (this.controls.moveUp){
		// 	this.camera.cam.position.y += this.speed;
		// } else if (this.controls.moveDown){
		// 	this.camera.cam.position.y -= this.speed;
		// }



		this.controls.signalStep
			? this.nextIteration()
			: null;

		if (this.controls.mouseMoved){
			this.camera.yaw.rotation.y -= this.mouseSensitivityFactor * this.controls.horizontalPan * this.degToRad;
			this.camera.pitch.rotation.x -= this.mouseSensitivityFactor * this.controls.verticalPan * this.degToRad;
			// this.camera.cam.rotation.y -= this.mouseSensitivityFactor * this.controls.horizontalPan * this.degToRad;
			// this.camera.cam.rotation.x -= this.mouseSensitivityFactor * this.controls.verticalPan * this.degToRad;
			// this.camera.pitch.rotation.x = Math.max( - this.pi2, Math.min( this.pi2, this.camera.pitch.rotation.x ) );
		}


		this.raycaster.setFromCamera( this.centerOfScreen, this.camera.cam );
		// const intersected = this.raycaster.intersectObject( this.particles );
		// if (intersected.length > 0) {
		// 	const particleIndex = intersected[0].index;
		// 	const selected = intersected[0].object.geometry.vertices[particleIndex];
		// 	if (this.selectedCell !== selected.name){
		// 		this.resetPreviousSelectedCell(this.selectedCell);
		// 		this.selectedCell = selected.vertices.name;
		// 		selected.geometry.color = this.selectedCellColor;
		// 	}
		// } else {
		// 	this.resetPreviousSelectedCell(this.selectedCell)
		// 	this.selectedCell = null;
		// }
		//
		// if (this.controls.isClicking && this.selectedCell && this.selectedCell !== this.prevSelectedCell){
		// 	this.prevSelectedCell = this.selectedCell;
		// 	this.flipVoxel(this.selectedCell);
		// } else if (!this.controls.isClicking) {
		// 	this.prevSelectedCell = null;
		// }


	  this.renderer.render(this.scene, this.camera.cam);
	}

}
