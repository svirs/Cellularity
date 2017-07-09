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
    //this mask is for the cell itself not its neighbor
    this.findCellStateBitMask = this.masks[13]; //Magic number! 262144 = 1 + 18 0s
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
    console.log('flipped')
    this._isCellAlive(offset)
      ? this._killCell(offset)
      : this._birthCell(offset);
  }

  flipCellState(x, y, z){
    return this._flipCellState(this._indexToOffset(x, y, z));
  }

  _killCell(offset){
    const cellState = this.getCellState(offset);
    //and not mask to clear single bit from 1 bit flag
    this.matrix.setUint32(offset, cellState & ~this.findCellStateBitMask);
  }

  killCell(x, y ,z){
    return this._killCell(this._indexToOffset(x, y, z));
  }

  _birthCell(offset){
    this.matrix.setUint32(offset, this.getCellState(offset) | this.findCellStateBitMask);
  }

  birthCell(x, y, z){
    return this._birthCell(this._indexToOffset(x, y, z));
  }

  toStateArray(){
    const arr = [];
    for (let i = 0; i < this.matrix.byteLength; i += 4){
      arr.push(
        this.matrix.getUint32(i)
      );
    }
    return arr;
  }

  _insideVisible(index3d){
    return 0 > index3d[0]|| index3d[0] >= this.maxIndexedDimensions.x ||
      0 > index3d[1] || index3d[1] >= this.maxIndexedDimensions.y ||
      0 > index3d[2] || index3d[2] >= this.maxIndexedDimensions.z;
  }

  toCellArray(){
    const arr = [];
    for (let i = 0; i < this.matrix.byteLength; i += 4){
      // if (this._offsetToIndex(i).reduce( (r, xyz) => r || (0 > xyz) || (xyz > ), false)){
      const index3d = this._offsetToIndex(i);
      if (this._insideVisible(index3d)){
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
      if(this._isCellAlive(i)){
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

  nextIteration(){
		//TODO update cell states for switched on cells
    //{offset: {x: 2, y: 4, z: 9} }
    for (let offset in this.liveCellsWithLoc()){
      this.liveCellsWithLoc[offset].x
      this.liveCellsWithLoc[offset].y
      this.liveCellsWithLoc[offset].z
    }
  }
}
