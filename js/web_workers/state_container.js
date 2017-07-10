const LUT = ( ()=> {
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

const masks = ( () => {
  const o = {};
  for (let i = 0; i < 27; i++){
    let s = '00000000000000000000000000000000'.split('');
    s[i] = '1';
    o[i] = parseInt(s.join(''), 2);
  }
  return o;
})();

const findCellStateBitMask = masks[13];

let matrix = null
let maxTotalDimensions = null;
let maxIndexedDimensions = null;

onmessage = msg => {
  const offset = msg.data.offset;
  const signal = msg.data.signal;
  switch (msg.data.signal){
    case 'init':
      maxTotalDimensions = msg.data.totalParams;
      maxIndexDimensions = msg.data.indexParams;
      matrix = init(maxTotalDimensions);
      sendMessage(
        {
          signal,
          byteLength: matrix.byteLength
        }
      );
      break;
    case 'update':
      break;
    case 'cell_state':
      sendMessage(
        {
          signal,
          offset: (getCellState(offset))
        }
      );
      break;
    case 'flip_state':
      sendMessage(
        {
          signal,
          state: (flipCellState(offset)),
          offset
        }
      );
      break;
    case 'cell_array':
    debugger
      sendMessage({
        signal,
        array: (toCellArray())
      });
      break;
    default:
      break;
  }
};


sendMessage = obj => postMessage(obj);

init = params => new DataView(generateArrayBuffer(...params));

generateArrayBuffer = (x, y, z) => {
  const uint32Bytes = 4;
  const totalVolumeBytes = x * y * z * uint32Bytes; // volume cube + perma dead cell shell
  return new ArrayBuffer(totalVolumeBytes);
};

getCellState = offset => matrix.getUint32(offset);

isCellAlive = offset => {
  return Boolean(getCellState(offset) & findCellStateBitMask);
}

flipCellState = offset => {
  isCellAlive(offset)
    ? killCell(offset)
    : birthCell(offset);
  return getCellState(offset);
};

killcell = offset => {
  const cellState = getCellState(offset);
  matrix.setUint32(offset, cellState & ~findCellStateBitMask);
};

birthCell = offset => matrix.setUint32(
  offset,
  this.getCellState(offset) | findCellStateBitMask
);

toStateArray = _ => {
  const arr = [];
  for (let i = 0; i < matrix.byteLength; i += 4){
    arr.push(
      matrix.getUint32(i)
    );
  }
  return arr;
}

_offsetToIndex = offset =>{
  //will only work for valid coords within the non perma dead voxel space
  let voxelOffset = offset / 4;
  const z = Math.floor(voxelOffset / (maxTotalDimensions.x * maxTotalDimensions.y));
  voxelOffset -= z * maxTotalDimensions.x * maxTotalDimensions.y;
  const y = Math.floor(voxelOffset / maxTotalDimensions.x);
  const x = voxelOffset % maxTotalDimensions.x;
  return [x - 1, y - 1, z - 1];
}

_insideVisible = index3d => {
  return 0 > index3d[0]|| index3d[0] >= maxIndexedDimensions.x ||
    0 > index3d[1] || index3d[1] >= maxIndexedDimensions.y ||
    0 > index3d[2] || index3d[2] >= maxIndexedDimensions.z;
}

toCellArray = _ =>{
  const arr = [];
  for (let i = 0; i < matrix.byteLength; i += 4){
    // if (this._offsetToIndex(i).reduce( (r, xyz) => r || (0 > xyz) || (xyz > ), false)){
    const index3d = _offsetToIndex(i);
    if (_insideVisible(index3d)){
      continue;
    }
    arr.push(
      {
        state: (isCellAlive(i) ? 1 : 0),
        offset: i
      }
    );
  }
  return arr;
}

liveCellsWithLoc = _ =>{
  const obj = {};
  let counter = 0;
  for (let i = 0; i < matrix.byteLength; i += 4){
    if(isCellAlive(i)){
      const [x, y, z] = _offsetToIndex(i)
      obj[i] = {
        x,
        y,
        z,
      };
    }
  }

  return obj;
}

_LUTResult = uint8 =>{
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

numberLiveNeighbors = offset =>{
  //hamming weight!
  let adjacents = 0;
  for (let i = 0; i < 4; i++){
    adjacents += _LUTResult(matrix.getUint8(offset + i));
  }
  return adjacents && _isCellAlive(offset) ? adjacents - 1 : adjacents;
}
