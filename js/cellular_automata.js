class CellularAutomataStore{
  constructor(x, y, z){
    this.maxIndexedDimensions = {x, y, z};
    this.maxTotalDimensions = {};
    for (let prop in this.maxIndexedDimensions){
      this.maxTotalDimensions[prop] = this.maxIndexedDimensions[prop] + 2;
    }
    this.matrix = new DataView(this.CAMatrixGenerator(
      this.maxTotalDimensions.x,
      this.maxTotalDimensions.y,
      this.maxTotalDimensions.z
    ));
    //look up table (number of 1 bits in uint8): [arr of uint8s]
    this.LUT = ( ()=> {
      const o = {};
      for (let i = 0; i < 256; i++){
        const s = i.toString(2).split('').filter( n => n === '1').length;
        o[i] = s;
      }
      const f = {};
      for (let d of [0,1,2,3,4,5,6,7,8]){
        f[d] = [];
      }
      for (let n in o){
        f[o[n]].push(parseInt(n));
      }
      return f;
    })();
    this.masks = ( () => {
      const o = {};
      for (let i = 0; i < 27; i++){
        let s = '00000000000000000000000000000000'.split('');
        s[i] = '1';
        o[i] = parseInt(s.join(''), 2);
      }
      return o;
    })();
    //[y][z][x]
    this.maskFromDeltas = [
                            [
                              [0, 1, 2],
                              [3, 4, 5],
                              [6, 7, 8]
                            ],
                            [
                              [9, 10, 11],
                              [12, 13, 14],
                              [15, 16, 17]
                            ],
                            [
                              [18, 19, 20],
                              [21, 22, 23],
                              [24, 25, 26]
                            ]
                          ];

    //this mask is for the cell itself not its neighbor
    this.findCellStateBitMask = this.masks[13]; //Magic number! 262144 = 1 + 18 0s
    this.isUpdating = 0;

  }

  CAMatrixGenerator(x, y, z){
    const uint32Bytes = 4;
    let totalVolumeBytes = x * y * z * uint32Bytes; // volume cube + perma dead cell shell
    return new ArrayBuffer(totalVolumeBytes);
  }

  _indexToOffset(x, y, z){
    ///returns unique memory location in ArrayBuffer for the multidimentional array indexing
    return 4 * ((x + 1) + (this.maxTotalDimensions.x * ((y + 1) + (this.maxTotalDimensions.y * (z + 1)))));
  }

  _offsetToIndex(offset){
    //will only work for valid coords within the non perma dead voxel space
    let voxelOffset = offset / 4;
    const z = Math.floor(voxelOffset / (this.maxTotalDimensions.x * this.maxTotalDimensions.y));
    voxelOffset -= z * this.maxTotalDimensions.x * this.maxTotalDimensions.y;
    const y = Math.floor(voxelOffset / this.maxTotalDimensions.x);
    const x = voxelOffset % this.maxTotalDimensions.x;
    return [x - 1, y - 1, z - 1];
  }

  _getCellState(offset){
    return this.matrix.getUint32(offset); //getUint32
  }

  getCellState(x, y, z){
    return this._getCellState(this._indexToOffset(x, y ,z))
  }

  _flipCellState(offset){
    // const prevState = this.getCellState(offset);
    if (this._isCellAlive(offset)){
      this._killCell(offset);
      return 0;
    } else{
      this._birthCell(offset);
      return 1;
    }
  }

  flipCellState(x, y, z){
    const offset = this._indexToOffset(x, y, z);
    this.updateNeighborState(x, y, z, offset, this._flipCellState(offset))
  }

  flipCellStateWithOffset(offset){
    // debugger
    const [x, y, z] = this._offsetToIndex(offset);
    this.updateNeighborState(x, y, z, offset, this._flipCellState(offset))
  }

  _killCell(offset){
    const cellState = this._getCellState(offset);
    this.matrix.setUint32(offset, cellState & ~this.findCellStateBitMask);
    return 0;
  }

  killCell(x, y ,z){
    return this._killCell(this._indexToOffset(x, y, z));
  }

  _birthCell(offset){
    this.matrix.setUint32(offset, this._getCellState(offset) | this.findCellStateBitMask);
    return 1;
  }

  birthCell(x, y, z){
    return this._birthCell(this._indexToOffset(x, y, z));
  }

  toStateArrayRaw(){
    const arr = [];
    for (let i = 0; i < this.matrix.byteLength; i += 4){
      arr.push(this.matrix.getUint32(i));
    }
    return arr;
  }

  toStateArray(){
    const arr = [];
    for (let i = 0; i < this.matrix.byteLength; i += 4){
      const index3d = this._offsetToIndex(i);
      if (this._isHiddenCell(index3d)){
        continue;
      }
      arr.push(
        {
          liveNeighbors: this._numberLiveNeighbors(i),
          selfState: (this._isCellAlive(i) ? 1 : 0),
          offset: i
        }
      );
    }
    return arr;
  }


  toStateArrayPromise(){
    return this.makeAttrArray(
      {
        selfState: (i) => this._isCellAlive(i) ? 1 : 0,
        liveNeighbors: (i) => this._numberLiveNeighbors(i)
      }
    );
    // .then(
    //   arr => {
    //     let newArr = [];
    //     let total = arr.reduce((arr, a) => arr + a.length, 0);
    //     return new Promise((res, rej) => {
    //       arr.forEach(el =>{
    //         setInterval(()=>{
    //           newArr = newArr.concat(el);
    //           total -= 1;
    //           total === 0 ? res(newArr) : null;
    //         }, 0);
    //       });
    //     });
    //   }
    // );
  }

  toCellArrayPromise(){
    return this.makeAttrArray({state: this._isCellAlive(i) ? 1 : 0});
  }

  makeAttrArray(obj){
    //obj is key: fxn that takes in byteoffset
    //{selfState: (i) => this._isCellAlive(i) ? 1 : 0,
    //liveNeighbors: this._numberLiveNeighbors}
    //offset always a key
    const promiseArray = [];
    const e = 128; //4 bytes per Uint32
    // const numberUint32 = this.matrix.byteLength / 4;
    for (let i = 0; i < this.matrix.byteLength; i += e){
      // promiseArray.push(new DataView(this.matrix.buffer, i, i + e));
      promiseArray.push([i, i + e]);
    }
    return Promise.all(
      promiseArray.map(bounds => {
        return (new Promise((res, rej) => {
          const arr = [];
          const id = setTimeout( ()=> {
            for(let b = bounds[0]; b < bounds[1] && b < this.matrix.byteLength; b += 4){
              const index3d = this._offsetToIndex(b);
              if (this._isHiddenCell(index3d)){
                continue;
              }
              const attributesObject = Object.assign({}, obj, {offset: (b) => b});
              for (let prop in attributesObject){
                attributesObject[prop] = attributesObject[prop](b);
              }

              arr.push(attributesObject);
            }
            res(arr);
          }, 0);
        }))
      })
    );
  }



  _isHiddenCell(index3d){
    //operating on invisible boundary dead cells
    return 0 > index3d[0]|| index3d[0] >= this.maxIndexedDimensions.x ||
      0 > index3d[1] || index3d[1] >= this.maxIndexedDimensions.y ||
      0 > index3d[2] || index3d[2] >= this.maxIndexedDimensions.z;
  }

  toCellArray(){
    const arr = [];
    for (let i = 0; i < this.matrix.byteLength; i += 4){
      // if (this._offsetToIndex(i).reduce( (r, xyz) => r || (0 > xyz) || (xyz > ), false)){
      const index3d = this._offsetToIndex(i);
      if (this._isHiddenCell(index3d)){
        continue;
      }
      arr.push(
        {
          state: (this._isCellAlive(i) ? 1 : 0),
          offset: i
        }
      );
    }
    return arr;
  }

  liveCellsWithLoc(){
    const obj = {};
    let counter = 0;
    for (let i = 0; i < this.matrix.byteLength; i += 4){
      if(this._isCellAlive(i) && !this._isHiddenCell(this._offsetToIndex(i))){
        const [x, y, z] = this._offsetToIndex(i)
        obj[i] = {
          x,
          y,
          z,
        };
      }
    }
    return obj;
  }


  _isCellAlive(offset){
    return Boolean(this._getCellState(offset) & this.findCellStateBitMask);
  }

  isCellAlive(x, y, z){
    return this._isCellAlive(this._indexToOffset(x, y, z));
  }

  numberLiveNeighbors(x, y, z){
    return this._numberLiveNeighbors(this._indexToOffset(x, y ,z))
  }

  _numberLiveNeighbors(offset){
    //hamming weight!
    let adjacents = 0;
    for (let i = 0; i < 4; i++){
      adjacents += this._LUTResult(this.matrix.getUint8(offset + i));
    }
    return adjacents && this._isCellAlive(offset) ? adjacents - 1 : adjacents;
  }

  _LUTResult(uint8){
    if (uint8 === 0) {
      return 0;
    } else if (uint8 === 255) {
      return 8;
    } else if (this.LUT['1'].includes(uint8)) {
      return 1;
    } else if (this.LUT['7'].includes(uint8)) {
      return 7;
    } else if (this.LUT['2'].includes(uint8)) {
      return 2;
    } else if (this.LUT['6'].includes(uint8)) {
      return 6;
    } else if (this.LUT['3'].includes(uint8)) {
      return 3;
    } else if (this.LUT['5'].includes(uint8)) {
      return 5;
    } else if (this.LUT['4'].includes(uint8)) {
      return 4;
    } else {
      return -1;
    }
  }

  nextIteration(rules){
    //birth or kill cells
    //number live neighbors
    const dieRules = rules.deathWhen;
    const birthRules = rules.birthWhen;
    return this.toStateArrayPromise().then(
      stateObj => {
        // debugger
        const promiseArray = [];
        const e = 15;
        for (let i = 0; i < stateObj.length; i++){
        // for (let i = 0; i < stateObj.length; i += e){
          // const slice = stateObj.slice(i, i + e);
          const slice = stateObj[i];
          promiseArray.push(
            (new Promise((res, rej) => {
              let newState = 0;
              setTimeout( () => {
                res(slice.map(bit => {
                  if (bit.selfState === 1){
                    //use dieRules
                    if (dieRules.length && dieRules.includes(bit.liveNeighbors)){
                      //cell dies
                      newState = this._killCell(bit.offset)
                    }
                  } else if (birthRules.length && birthRules.includes(bit.liveNeighbors)){
                    //use birthRules
                    //cell gets birthed
                    newState = this._birthCell(bit.offset)

                  }
                  // this.updateNeighborState(...[...this._offsetToIndex(bit.offset)], bit.offset, newState)
                  debugger
                  return [...this._offsetToIndex(bit.offset), bit.offset, newState];
                }));
                // res(updateNeighborParams);
              }, 0);
            })).then((payload) => {
              return new Promise((res, rej) => {
                setTimeout( ()=> {
                  this.reduceNeighbors(payload);
                  res();
                }, 0);
              });
              // setTimeout( () => {
              //   slice.forEach(bit => {
              //     if (bit.selfState === 1){
              //       //use dieRules
              //       if (dieRules.length && dieRules.includes(bit.liveNeighbors)){
              //         //cell dies
              //         newState = this._killCell(bit.offset)
              //       }
              //     } else if (birthRules.length && birthRules.includes(bit.liveNeighbors)){
              //       //use birthRules
              //       //cell gets birthed
              //       newState = this._birthCell(bit.offset)
              //
              //     }
              //     // this.updateNeighborState(...[...this._offsetToIndex(bit.offset)], bit.offset, newState)
              //     updateNeighborParams.push([...this._offsetToIndex(bit.offset), bit.offset, newState]);
              //   });
              //   res(updateNeighborParams);
              // }, 0);
              // return this.reduceNeighbors(payload);
            })
          );
        }
        return Promise.all(promiseArray);
      }
    );
  }


  reduceNeighbors(updateNeighborParams){
    //part of promise
    const promiseArray = []
    const e = 5;
    for (let i = 0; i < updateNeighborParams.length; i += e){
      const slice = updateNeighborParams.slice(i, i+e);
      promiseArray.push(
        (new Promise((res, rej) => {
          const id = setTimeout( () => {
            slice.forEach(b => this.updateNeighborState(...b));
            res(id);
          }, 0);
        }))
      );

    }
    return Promise.all(promiseArray);
  }


  updateNeighborState(x, y, z, offset, state){
    //coords of chained cell with current state
    //part of promise
    const mutateInt = state ? this._neighborBirth : this._neighborDeath;
    for (let xB = -1; xB < 2; xB++){
      for (let yB = -1; yB < 2; yB++){
        for (let zB = -1; zB < 2; zB++){
          const [dX, dY, dZ] = [x + xB,y + yB, z + zB];
          if (this._isHiddenCell([dX, dY, dZ]) || !(xB || yB || zB)) continue;
          const neighborOffset = this._indexToOffset(dX, dY, dZ);
          const currentNeighborState = this.matrix.getUint32(neighborOffset);
          const maskIndex = this.maskFromDeltas[yB + 1][zB +1][xB + 1];
          // if (neighborOffset === 364) {debugger
          // if(offset === 164){debugger}
          // console.log(this.matrix.getUint32(164).toString(2))
          mutateInt(neighborOffset, currentNeighborState, this.masks[maskIndex], this);
        }
      }
    }
  }

  _neighborDeath(offset, int, mask, ctx){
    // if(offset===164){debugger}
    ctx.matrix.setUint32(offset, int & ~mask);
  }

  _neighborBirth(offset, int, mask, ctx){
    // if(offset === 164){
    //   debugger
    // }
    ctx.matrix.setUint32(offset, int | mask);
  }
}
