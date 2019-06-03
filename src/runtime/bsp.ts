console.log('eat BrightSign pizza');

let _singleton: BSP | null = null;

export class BSP {
  constructor() {
    if (!_singleton) {
      console.log('bsp constructor invoked');
      _singleton = this;
    }
  }
}

export const bsp = new BSP();
