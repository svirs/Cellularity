//menuGlobalValues, gameGlobalValues, and pointerLockApi are global
//likely:  {doc: "pointerLockElement", change: "pointerlockchange",
//request: "requestPointerLock", exit: "exitPointerLock", error: "pointerlockerror"}
class Movement {
  constructor(){
    this.movingForward = false,
    this.movingBackward = false,
    this.strafeRight = false,
    this.strafeLeft = false,
    this.moveDown = false,
    this.moveUp = false,
    // this.canMove = false,
    this.horizontalPan = 0;
    this.verticalPan = 0;
    this.mouseMoved = false;
    this.timeOut = null;
    this.isClicking = false;
    this.justClicked = false;
    this.signalStep = false;
    this.addEvents();
}


  addEvents(){

    if (pointerLockApi) {
      const onMouseMove = ( e => {
        this.mouseMoved = true;
        clearTimeout(this.timeOut)
        this.horizontalPan = e[pointerLockApi.movementX];
        this.verticalPan = e[pointerLockApi.movementY];
        this.timeOut = setTimeout( ( _ => this.mouseMoved = false).bind(this), 16)
      } ).bind(this);

      const onMouseDown = ( e => {
        this.isClicking = true
      }).bind(this);

      const onMouseUp = ( e => {
        this.isClicking = false
        this.justClicked = true;
      }).bind(this);


      document.addEventListener(pointerLockApi.change, () => {
        if(document.pointerLockElement === gameGlobalValues.pointerLocker){
          // this.canMove = true;
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mousedown', onMouseDown);
          document.addEventListener('mouseup', onMouseUp);
        } else {
          //no longer in pointer lock
          // this.canMove = false;
          this.mouseMoved = false;

          document.querySelector('#menu-container').style.display = '';

          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mousedown', onMouseDown);
          document.removeEventListener('mouseup', onMouseUp);

        }
      });

      document.addEventListener(pointerLockApi.error, () => {
        console.log('point lock error')
      });




      document.addEventListener('keyup', (e) => {
        switch (e.key) {
          case 'w':
          case 'W':
            this.movingForward = false;
            return;
          case 'a':
          case 'A':
            this.strafeLeft = false;
            return;
          case 's':
          case 'S':
            this.movingBackward = false;
            return;
          case 'd':
          case 'D':
            this.strafeRight = false;
            return;
          case 'Shift':
            this.moveDown = false;
            return;
          case ' ':
            this.moveUp = false;
            return;
          case 'Escape':
            const menu = document.querySelector('#menu-container');
            menu.style.display === 'none'
              ? (document.exitPointerLock(), menu.style.display = '')
              :null;
              return;
          case 'f':
          case 'F':
            this.signalStep = false;
          default:
            break;
        }
      });
false
      document.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'w':
            this.movingForward = true;
            break;
          case 'a':
            this.strafeLeft = true;
            break;
          case 's':
            this.movingBackward = true;
            break;
          case 'd':
            this.strafeRight = true;
            break;
          case 'Shift':
            this.moveDown = true;
            return;
          case ' ':
            this.moveUp = true;
            return;
          case 'f':
            this.signalStep = true;
            return;
          default:
            return;
        }
      });

    }
  }

}
