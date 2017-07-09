class CAGame {
	constructor(length, width, height, rules){
		this.rules = rules;
		this.deadCellColor = new THREE.Color(0xff0000);
		this.liveCellColor = new THREE.Color(0x00ff00);
		this.selectedCellColor = new THREE.Color(0x0000ff);
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
		this.raycaster.linePrecision = 3;

		this.selectedCell = null;
		this.justFlipped = [];
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

	makeVoxel(state){
		// state 1 or 0
		const color = state ? this.liveCellColor : this.deadCellColor;
		const box = new THREE.BoxGeometry( 1, 1, 1 );
		const wires = new THREE.WireframeGeometry( box );
		const material = new THREE.LineBasicMaterial( { color: color, linewidth: 2 } );

		const voxel = new THREE.LineSegments(wires, material);
		voxel.material.depthTest = false;
		voxel.material.transparent = true;
		return voxel;
	}

	swapName(name){
		const [offset, state] = name.split('_');
		return offset + '_' + (parseInt(state) ? 0 : 1)
	}

	flipCell(name){
		const [offset, state] = name.split('_');
		const voxel = this.scene.getObjectByName(name);
		const newName = this.swapName(name);
		voxel.name = newName;  //swap
		// this.resetPreviousSelectedCell(newName);
		voxel.material.color = parseInt(state)
			? this.liveCellColor
			: this.deadCellColor
	}

	resetPreviousSelectedCell(name){
		if (name){
			const prevSelected = this.scene.getObjectByName(name) ||
														this.scene.getObjectByName(this.swapName(name));

			prevSelected.material.color = parseInt(prevSelected.name.slice(-1))
				? this.liveCellColor
				: this.deadCellColor
		}
	}

	init(){
		this.cellStore.toCellArray().forEach( (bit) => {
			const voxel = this.makeVoxel(bit.state);
			voxel.name = bit.offset + '_' + bit.state;
			this.scene.add( voxel );
			voxel.position.set(...this.cellStore._offsetToIndex(bit.offset));
		});

		this.camera.yaw.translateZ(5);


		// const light = new THREE.DirectionalLight( 0xffffff, 1 );
		// light.position.set( 1, 1, 1 ).normalize();
		this.scene.background = new THREE.Color( 0xf0f0f0 )
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



		if (this.controls.mouseMoved){
			this.camera.yaw.rotation.y -= this.mouseSensitivityFactor * this.controls.horizontalPan * this.degToRad;
			this.camera.pitch.rotation.x -= this.mouseSensitivityFactor * this.controls.verticalPan * this.degToRad;
			// this.camera.cam.rotation.y -= this.mouseSensitivityFactor * this.controls.horizontalPan * this.degToRad;
			// this.camera.cam.rotation.x -= this.mouseSensitivityFactor * this.controls.verticalPan * this.degToRad;
			// this.camera.pitch.rotation.x = Math.max( - this.pi2, Math.min( this.pi2, this.camera.pitch.rotation.x ) );
		}

		this.raycaster.setFromCamera( this.centerOfScreen, this.camera.cam );
		const intersects = this.raycaster.intersectObjects( this.scene.children );
		if (intersects.length > 0) {
			const selected = intersects[0].object;
			if (this.selectedCell !== selected.name){
				this.resetPreviousSelectedCell(this.selectedCell);
				this.selectedCell = selected.name;
				selected.material.color = this.selectedCellColor;
			}
		} else {
			this.resetPreviousSelectedCell(this.selectedCell)
			this.selectedCell = null;
		}

		if (this.controls.isClicking && this.selectedCell){
			const prefix = this.selectedCell.slice(0, -2);
			this.justFlipped.includes(prefix)
				? null
				: (this.justFlipped.push(prefix), this.flipCell(this.selectedCell));
		} else if (!this.controls.isClicking) {
			this.justFlipped = [];
		}

	  this.renderer.render(this.scene, this.camera.cam);
	}

}
