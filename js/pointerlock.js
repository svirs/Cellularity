//menuGlobalValues, gameGlobalValues, and pointerLockApi are global
//likely:  {doc: "pointerLockElement", change: "pointerlockchange",
//request: "requestPointerLock", exit: "exitPointerLock", error: "pointerlockerror"}

if (pointerLockApi) {
  document.addEventListener(pointerLockApi.change, () => {
    if(document.pointerLockElement === gameGlobalValues.pointerLocker){
      gameGlobalValues.canMove = true;
    } else {
      //no longer in pointer lock
      gameGlobalValues.canMove = false;
      document.querySelector('#menu-container').style.display = '';
    }
  });

  document.addEventListener(pointerLockApi.error, () => {
    console.log('point lock error')
  });
}
