const menuGlobalValues = {
  adjacents: 26,
  rules: {
    deathWhen: [],
    birthWhen: []
  },
  dimensions: {
    x: null,
    y: null,
    z: null
  },
  stereoCamera: false,
  fov: null
};
//pointerLockApi is global
const pointerLockApi = ( () => {
  const _pointerLockKeys = ['doc', 'change', 'request', 'exit', 'error', 'movementX',  'movementY'];
  const _pointerLockValues = [
    ['pointerLockElement', 'pointerlockchange', 'requestPointerLock', 'exitPointerLock', 'pointerlockerror', 'movementX',  'movementY'],
    ['webkitPointerLockElement', 'webkitpointerlockchange', 'webkitRequestPointerLock', 'webkitExitPointerLock', 'webkitpointerlockerror', 'webkitMovementX',  'webkitMovementY'],
    ['mozPointerLockElement', 'mozpointerlockchange', 'mozRequestPointerLock', 'mozExitPointerLock', 'mozpointerlockerror', 'mozMovementX',  'mozMovementY']
  ].filter( arr => arr[0] in document ).shift();
  if (_pointerLockValues){
    return Object.assign({}, ..._pointerLockKeys.map((key, i) => ( {[key]: _pointerLockValues[i]})));
  } else {
    return null;
  }
} )();

const gameGlobalValues = {
  canMove: false,
  pointerLocker: document.body,


};
gameGlobalValues.pointerLocker.requestPointerLock = pointerLockApi
                                                    ? gameGlobalValues.pointerLocker[pointerLockApi.request]
                                                    : null;
document.exitPointerLock = document[pointerLockApi.exit];




//set-up menu
document.addEventListener('DOMContentLoaded', () => {
  const startGame = _ => {
    document.game = new CAGame(
      menuGlobalValues.dimensions.x,
      menuGlobalValues.dimensions.y,
      menuGlobalValues.dimensions.z,
      menuGlobalValues.rules
    );
    document.game.init();
  }

  //sliders for cellular automata dimensions update displayed values
  const getGlobalsKey = id => ({length: 'x', width: 'y', height: 'z'})[id];
  const setSliderMenuGlobals = (id, val) => {
    const k = getGlobalsKey(id);
    menuGlobalValues.dimensions[k] = val;
  }
  const updateSliderLabel = slider => slider.parentNode.querySelector('.display').innerHTML = slider.value;
  document.querySelectorAll('.voxel-cube > div input').forEach( (slider, idx, arr) => {
    //initial slider setting
    setSliderMenuGlobals(slider.parentNode.id, slider.value);
    slider.addEventListener('input', () => {
      // slider.parentNode.querySelector('.display').innerHTML = slider.value;
      updateSliderLabel(slider);
      //allow other sliders to have new max
      const slidersSetAtOne = Array.from(arr).reduce( (a, el) => {
        return a + (el.value === '1' ? 1 : 0);
      }, 0);
      console.log(slidersSetAtOne)
      arr.forEach((el) => {
        if (slidersSetAtOne === 1){
          el.max = 200;
          parseInt(el.value) > el.max ? (el.value = el.max) : null;
          updateSliderLabel(el);
        } else if (slidersSetAtOne === 2) {
          el.value === '1' ? null : (el.max = 500);
        } else {
          el.max = 50;
          parseInt(el.value) > parseInt(el.max) ? (el.value = el.max) : null;
          updateSliderLabel(el);
        }
      });
    });
  });

  //populate clickable cells for rules
  const toggleSelected = e => e.currentTarget.classList.toggle('rule-selected');
  // const toggleSelectedWhenDragging = e => {
  //   if (e.buttons !== 0) toggleSelected(e);
  // };
  document.querySelectorAll('.cell-rules .number-store').forEach( ruleBox => {
    const numberNeighborTag = document.createElement("DIV");
    numberNeighborTag.classList.add("number-neighbor");
    const rows = ruleBox.querySelectorAll('div');
    const chooseRow = i => {
      const lower = Math.floor((menuGlobalValues.adjacents + 1) / 3)
      const upper = lower * 2;
      return i >= upper
                ? 'row3'
                : i < lower
                    ? 'row1'
                    : 'row2';
    };
    for (let i = 0; menuGlobalValues.adjacents >= i; i++){
      const node = numberNeighborTag.cloneNode();
      node.innerHTML = i;
      node.classList.add(`rule-${i}`);
      node.addEventListener('click', toggleSelected);
      // node.addEventListener('mouseover', toggleSelectedWhenDragging);

      ruleBox.querySelector(`.${chooseRow(i)}`).appendChild(node);
    }
  });

  //buttons
  const deselect = className => {
    if (className === '.dead-cells'){
      debugger
      document.game.rules.deathWhen = [];
    } else if (className === '.live-cells') {
      document.game.rules.birthWhen = [];
    }
    document.querySelector(className)
            .querySelectorAll('.rule-selected, .rule-activated')
            .forEach(node => {
              node.classList.remove('rule-selected');
              node.classList.remove('rule-activated');
            });
  };
  const replaceGlobalRules = className => {
    document.querySelectorAll('.rule-selected').forEach(node => {
      node.classList.remove('rule-selected');
      node.classList.add('rule-activated');
    });

    return Array.from(document.querySelectorAll(`${className} .rule-activated`))
                .map(node => parseInt(node.innerHTML));
  };

  //deathWhen looks at live-cells's children
  document.querySelectorAll('BUTTON').forEach( button => {
    switch (button.name) {
      case 'reset-birth':
        button.addEventListener('click', _ => deselect('.dead-cells'))
        return;
      case 'reset-kill':
        button.addEventListener('click', _ => deselect('.live-cells'))
        return;
      case 'apply':
        //update rules AND sliders
        button.addEventListener('click', _ => {
          menuGlobalValues.rules.deathWhen = replaceGlobalRules('.live-cells');
          menuGlobalValues.rules.birthWhen = replaceGlobalRules('.dead-cells');
          let restart = false;
          document.querySelectorAll('.voxel-cube > div input')
                  .forEach( slider => {
                    const id = slider.parentNode.id;
                    const value = slider.value;
                    setSliderMenuGlobals(id, value);
                    if (menuGlobalValues.dimensions[getGlobalsKey(id)] !== document.game.sliderVariables[getGlobalsKey(id)]){
                      restart = true;
                    }
                  });

          const deaths = document.querySelectorAll('.live-cells .number-store .number-neighbor.rule-activated');
          const births = document.querySelectorAll('.dead-cells .number-store .number-neighbor.rule-activated');
          restart ? document.game.restartWithNewDimensions(menuGlobalValues.dimensions.x, menuGlobalValues.dimensions.y, menuGlobalValues.dimensions.z) : null;

          document.game.rules.deathWhen = Array.from(deaths).map(tag => parseInt(tag.innerHTML));
          document.game.rules.birthWhen = Array.from(births).map(tag => parseInt(tag.innerHTML));

        });
        return;
      default:
        return;
    }
  });

  //presets
  const gameOfLife = {
    //Z, Y deltas from bottom left point
    block: [[1,1], [2,1], [1, 2], [2, 2]],
    blinker: [[2,1], [2,2], [2,3]],
    toad: [[1, 2], [1, 3], [1,4], [2, 3], [2, 4], [2, 5]],
    glider: [[0,2], [1,0], [1,1], [2,1], [2,2]],
    gun: [
      [1,4], [1,5], [2,4], [2, 5], [11, 3], [11, 4], [11, 5],
      [12, 2], [12, 6], [13, 1], [13, 7], [14, 1], [14, 7], [15,4],
      [16, 2], [16, 6], [17, 3], [17, 4], [17, 5], [18, 4], [21, 5],
      [21, 6], [21, 7], [22, 5], [22, 6], [22, 7], [23, 4], [23, 8],
      [25, 3], [25, 4], [25, 8], [25, 9], [35, 6], [35, 7], [36, 6], [36, 7]
    ],
    generate: (pos, pattern) => pattern.map(arr => [arr[0] + pos[0], arr[1] + pos[1]])
  }

  const twoD = {
    dimensions: [1, 80, 80],
    birthRules: [3],
    deathRules: [0, 1, 4, 5, 6, 7, 8],
    //key also in gameOfLife
    liveCells: {
      gun: [[40, 55], [10, 20], [0, 0]],
      glider: [[30, 0], [31, 65], [23, 16], [56, 50]],
      toad: [[50, 50], [60, 60], [50, 40]],
      blinker: [[5, 5], [5, 10], [5, 20], [5, 40], [5, 60]],
      block: [[20, 20], [30, 30], [40, 40]]
    }
  };

  const gun = {
    dimensions: [1, 80, 80],
    birthRules: [3],
    deathRules: [0, 1, 4, 5, 6, 7, 8],
    //key also in gameOfLife
    liveCells: {
      gun: [[10, 65], [10, 40], [10, 15], ]
    }
  };

  const steady = {
    dimensions: [25, 25, 25],
    birthRules: [0, 12, 13, 14, 26],
    deathRules: [0, 12, 13, 14, 26],
    liveCells: {}
  };

  const wacky = {
    dimensions: [25, 25, 25],
    birthRules: [0, 11, 13, 24, 26],
    deathRules: [6, 11, 15, 22, 26],
    liveCells: {}
  };

  const updateCube = (node, options) => {
    if (node.classList.contains('rule-activated')){
      //inactivate
      document.querySelector('#length > input').value = 15;
      document.querySelector('#length > .display').innerHTML = 15;

      document.querySelector('#width > input').value = 15;
      document.querySelector('#width > .display').innerHTML = 15;

      document.querySelector('#height > input').value = 15;
      document.querySelector('#height > .display').innerHTML = 15;

      document.querySelector('.apply-button').click();
    } else{
      //activate
      document.querySelector('#length > input').value = options.dimensions[0];
      document.querySelector('#length > .display').innerHTML = options.dimensions[0];

      let w = document.querySelector('#width > input');
      w.max = 200;
      w.value = options.dimensions[1];

      document.querySelector('#width > .display').innerHTML = options.dimensions[1];

      let h = document.querySelector('#height > input');
      h.max = 200;
      h.value = options.dimensions[2];
      document.querySelector('#height > .display').innerHTML = options.dimensions[2];
      options.birthRules.forEach(n => {
        document.querySelector(`.dead-cells .rule-${n}`).classList.toggle('rule-selected');
      });

      options.deathRules.forEach(n => {
        document.querySelector(`.live-cells .rule-${n}`).classList.toggle('rule-selected');
      });

    }
  }

  const addCreatures = (node, options) => {
    document.querySelector('.apply-button').click();
    for (let creature in options.liveCells){
        options.liveCells[creature].forEach(zyPair => {
          gameOfLife[creature].map(pair => [zyPair[0] + pair[0], zyPair[1] + pair[1]])
                                .forEach(finalCoord => document.game.cellStore.flipCellState(0,...finalCoord.reverse()));
        });
    }
    document.game.updateCells();
  }




  document.querySelectorAll('.presets > button')
          .forEach( node => {
            node.addEventListener('click', ()=>{
              deselect('.dead-cells');
              deselect('.live-cells');
              switch (node.name) {
                case '2d':
                  updateCube(node, twoD);
                  addCreatures(node, twoD);
                  break;
                case 'gun':
                  updateCube(node, gun);
                  addCreatures(node, gun);
                  break;
                case 'steady':
                  updateCube(node, steady);
                  document.querySelector('.apply-button').click();
                  break;
                case 'wacky':
                  updateCube(node, wacky);
                  document.querySelector('.apply-button').click();
                  break;
                default:
                  break;
              }
            })
          });


  //vr-settings
  let disp = null
  const vrButton = document.querySelector('.vr-settings > button');
  vrButton.addEventListener('click', () => {
              try {
                disp.requestPresent([{source: document.game.renderer.domElement}]);
                document.querySelector('#menu-container').style.display = 'none';
              } catch (e) {}
              vrButton.classList.toggle('rule-selected');
              if (vrButton.classList.contains('rule-selected')){
                try {
                  navigator.getVRDisplays().then( d => {
                    disp = d[0]
                    document.game.swapCam(d[0]);
                  });
                } catch (e) {
                  alert('no vr support on your browser');
                }
              }
            });

  //play-button
  document.querySelector('.start-game > button')
          .addEventListener('click', () => {
            document.querySelector('#menu-container').style.display = 'none';
            gameGlobalValues.pointerLocker.requestPointerLock();
          });


  const cannotInit = (str) => document.querySelector('#menu-container').innerHTML = str;
  
  if (!pointerLockApi) {
      const err = "Unfortunately, your browser does not<br/>support the Point Lock API. Please<br/>consider upgrading to the latest version<br/>of your browser.";
      cannotInit(err);
      return;
  } else if (!window.WebGLRenderingContext){
      const err = "Unfortunately, your browser does not<br/>support WebGL. Please<br/>consider upgrading to the latest version<br/>of your browser.";
      cannotInit(err);  
      return;
  //VR CHECK
  } else {
      startGame();
  }
});
