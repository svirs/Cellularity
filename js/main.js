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
  }
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
//
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
  if (!pointerLockApi) {
      const infoBox =  document.querySelector('#menu-container');
      infoBox.innerHTML = "Unfortunately, your browser does not<br/>support the Point Lock API. Please<br/>consider upgrading to the latest version<br/>of your browser.";
      return;
  }

  //sliders for cellular automata dimensions update displayed values
  const setSliderMenuGlobals = (id, val) => {
    const k = ({length: 'x', width: 'y', height: 'z'})[id];
    menuGlobalValues.dimensions[k] = val;
  }
  document.querySelectorAll('.voxel-cube > div input').forEach( slider => {
    //initial slider setting
    setSliderMenuGlobals(slider.parentNode.id, slider.value);
    slider.addEventListener('input', () => {
      slider.parentNode.querySelector('.display').innerHTML = slider.value;
    });
  });

  //populate clickable cells for rules
  const toggleSelected = e => e.currentTarget.classList.toggle('rule-selected');
  const toggleSelectedWhenDragging = e => {
    if (e.buttons !== 0) toggleSelected(e);
  };
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
      node.addEventListener('click', toggleSelected);
      node.addEventListener('mouseover', toggleSelectedWhenDragging);

      ruleBox.querySelector(`.${chooseRow(i)}`).appendChild(node);
    }
  });

  //buttons
  const deselect = className => {
    document.querySelector(className)
            .querySelectorAll('.rule-selected')
            .forEach(node => node.classList.remove('rule-selected'));
  };
  const replaceGlobalRules = className => {
    return Array.from(document.querySelectorAll(`${className} .rule-selected`))
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

          document.querySelectorAll('.voxel-cube > div input')
                  .forEach( slider => {
                    setSliderMenuGlobals(slider.parentNode.id, slider.value);
                  });
        });
        return;
      default:
        return;
    }
  });

  //play-button
  document.querySelector('.start-game > button')
          .addEventListener('click', () => {
            document.querySelector('#menu-container').style.display = 'none';
            gameGlobalValues.pointerLocker.requestPointerLock();
          });

  document.game = new CAGame(
    // menuGlobalValues.dimensions.x,
    // menuGlobalValues.dimensions.y,
    // menuGlobalValues.dimensions.z,
    3, 3, 3,
    menuGlobalValues.rules
  );
  document.game.init();
});
