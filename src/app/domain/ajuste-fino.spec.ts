import { aplicarPaso } from './ajuste-fino';

describe('aplicarPaso', () => {
  it('E5: cada flecha desplaza la ficha 0,1 m en su dirección', () => {
    const origen = { x: 4, y: 4 };
    expect(aplicarPaso(origen, 'arriba')).toEqual({ x: 4, y: 3.9 });
    expect(aplicarPaso(origen, 'abajo')).toEqual({ x: 4, y: 4.1 });
    expect(aplicarPaso(origen, 'izquierda')).toEqual({ x: 3.9, y: 4 });
    expect(aplicarPaso(origen, 'derecha')).toEqual({ x: 4.1, y: 4 });
  });

  it('E6: el desplazamiento no saca la ficha de los límites del campo', () => {
    expect(aplicarPaso({ x: 9, y: 4 }, 'derecha')).toEqual({ x: 9, y: 4 });
    expect(aplicarPaso({ x: 0, y: 4 }, 'izquierda')).toEqual({ x: 0, y: 4 });
    expect(aplicarPaso({ x: 4, y: 0 }, 'arriba')).toEqual({ x: 4, y: 0 });
    expect(aplicarPaso({ x: 4, y: 9 }, 'abajo')).toEqual({ x: 4, y: 9 });
  });

  it('E7: varios toques seguidos acumulan el desplazamiento', () => {
    let punto = { x: 4, y: 4 };
    punto = aplicarPaso(punto, 'derecha');
    punto = aplicarPaso(punto, 'derecha');
    punto = aplicarPaso(punto, 'abajo');
    expect(punto).toEqual({ x: 4.2, y: 4.1 });
  });
});
