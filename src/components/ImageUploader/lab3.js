import React, { useState, useEffect, useRef } from 'react';
import grabIcon from '../../image/cursor.svg';
import pipetteIcon from '../../image/pipette.svg';
import { createPortal } from 'react-dom';

function ImageUploader() {
  const [imageSrc, setImageSrc] = useState(null);
  const [colorValue, setColorValue] = useState('-');
  const [coordinatesValue, setCoordinatesValue] = useState('-');
  const [imageSizeValue, setImageSizeValue] = useState('-');
  const [scale, setScale] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [resizeMode, setResizeMode] = useState('percent'); // 'percent' or 'pixel'
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [interpolationMethod, setInterpolationMethod] = useState('nearestNeighbor');
  const [activeTool, setActiveTool] = useState('hand'); // 'hand' or 'pipette'
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [color1, setColor1] = useState(null);
  const [color2, setColor2] = useState(null);
  const canvasRef = useRef(null);
  const canvasBox = useRef(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [mouseDownPosition, setMouseDownPosition] = useState(null);


  const handleCanvasMouseDown = (event) => {
    if (activeTool === 'hand') {
        canvasBox.current.classList.add('canvas-hand_grabbing');
      const { x, y } = getPixelCoordinates(event);
      setMouseDownPosition({ x, y });
    }
  };


  const handleKeyDown = (event) => {
    if (activeTool === 'hand') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      console.log(ctx)
        event.preventDefault();
        event.stopPropagation();
      switch (event.key) {
        case 'ArrowLeft':
            console.log(canvas.width * scale + canvasPosition.x);
          setCanvasPosition((prevPosition) => ({ ...prevPosition, x: canvas.width * scale + prevPosition.x > 100 ? prevPosition.x - 50 : prevPosition.x }));
          break;
        case 'ArrowRight':
            console.log(canvas.width * scale - 20, canvasPosition);
          setCanvasPosition((prevPosition) => ({ ...prevPosition, x: canvas.width * scale - 100 > prevPosition.x ? prevPosition.x + 50 : prevPosition.x }));
          break;
        case 'ArrowUp':
            console.log('t');
          setCanvasPosition((prevPosition) => ({ ...prevPosition, y: canvas.height * scale + prevPosition.y > 100 ? prevPosition.y - 50 : prevPosition.y }));
          break;
        case 'ArrowDown':
            console.log('d');
          setCanvasPosition((prevPosition) => ({ ...prevPosition, y: canvas.height * scale - prevPosition.y > 100 ? prevPosition.y + 50 : prevPosition.y }));
          break;
        default:
          break;
      }
    }
  };


  // Функция для вычисления координат пикселя относительно изображения
  const getPixelCoordinates = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    return { x, y };
  };

  // Функция для получения значения цвета пикселя
  const getPixelColor = (ctx, x, y) => {
    const pixelData = ctx.getImageData(x * scale, y * scale, 1, 1).data;
    const rgbColor = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
    return rgbColor;
  };

  // Функция для перевода RGB в XYZ
  const rgbToXyz = (r, g, b) => {
    // Нормализация значений RGB к диапазону 0-1
    const R = r / 255;
    const G = g / 255;
    const B = b / 255;

    // Перевод RGB в XYZ
    let X = 0.490 * R + 0.310 * G + 0.200 * B;
    let Y = 0.177 * R + 0.812 * G + 0.011 * B;
    let Z = 0.000 * R + 0.010 * G + 0.990 * B;

    // Линеаризация
    X = X > 0.04045 ? Math.pow((X + 0.055) / 1.055, 2.4) : X / 12.92;
    Y = Y > 0.04045 ? Math.pow((Y + 0.055) / 1.055, 2.4) : Y / 12.92;
    Z = Z > 0.04045 ? Math.pow((Z + 0.055) / 1.055, 2.4) : Z / 12.92;

    return { X, Y, Z };
  };

  // Функция для перевода XYZ в Lab
  const xyzToLab = (X, Y, Z) => {
    // Белые точки для D65
    const Xn = 0.95047;
    const Yn = 1.00000;
    const Zn = 1.08883;

    // Перевод XYZ в Lab
    const fx = X / Xn;
    const fy = Y / Yn;
    const fz = Z / Zn;

    // Перевод в нелинейное пространство
    const f = (t) => {
      if (t > 0.008856) {
        return Math.pow(t, 1 / 3);
      } else {
        return (7.787 * t) + (16 / 116);
      }
    };

    const L = 116 * f(fy) - 16;
    const a = 500 * (f(fx) - f(fy));
    const b = 200 * (f(fy) - f(fz));

    return { L, a, b };
  };

  // Функция для расчета контраста
  const calculateContrast = (color1, color2) => {
    const [r1, g1, b1] = color1.match(/\d+/g).map(Number);
    const [r2, g2, b2] = color2.match(/\d+/g).map(Number);

    // Перевод в значения яркости
    const L1 = (0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1) / 255;
    const L2 = (0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2) / 255;

    // Вычисление контраста
    const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return contrast;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      setImageSrc(reader.result);
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (event) => {
    setImageSrc(event.target.value);
  };

  const handleScaleChange = (event) => {
    setScale(parseFloat(event.target.value) / 100);
  };

  const handleResizeModeChange = (event) => {
    setResizeMode(event.target.value);
  };

  const handleResizeWidthChange = (event) => {
    setResizeWidth(event.target.value);
  };

  const handleResizeHeightChange = (event) => {
    setResizeHeight(event.target.value);
  };

  const handleMaintainAspectRatioChange= (event) => {
    setMaintainAspectRatio(event.target.checked);
  };

  const handleInterpolationMethodChange = (event) => {
    setInterpolationMethod(event.target.value);
  };

  const handleResize = () => {
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const originalWidth = img.width;
        const originalHeight = img.height;
        

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const resizedWidth = resizeMode === 'percent' ? originalWidth * (resizeWidth / 100) : resizeWidth;
        const resizedHeight =
          resizeMode === 'percent'
            ? originalHeight * (resizeHeight / 100)
            : maintainAspectRatio
            ? (resizedWidth / originalWidth) * originalHeight
            : resizeHeight;

        // Используйте nearestNeighbor для алгоритма ближайшего соседа
        console.log('tut',resizedHeight,resizedWidth)
        const resizedImage = resizeCanvas(
          ctx,
          img,
          resizedWidth,
          resizedHeight,
          interpolationMethod === 'nearestNeighbor' ? 'nearestNeighbor' : 'bilinear'
        );

        canvas.width = resizedImage.width;
        canvas.height = resizedImage.height;
        ctx.drawImage(resizedImage, 0, 0);

        setImageSrc(resizedImage.toDataURL());
        setImageSizeValue(`${resizedImage.width} x ${resizedImage.height}`);
        setShowDialog(false);
      };
      img.src = imageSrc;
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const handleSaveImage = () => {
    if (imageSrc) {
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = 'resized_image.png';
      link.click();
    }
  };

  const handleToolClick = (tool) => {
    setActiveTool(tool);
    setShowColorPanel(tool === 'pipette');
  };

  const handleCanvasClick = (event) => {
    const { x, y } = getPixelCoordinates(event);
    if (activeTool === 'pipette') {
      const rgbColor = getPixelColor(canvasRef.current.getContext('2d'), x, y);

      // Получаем XYZ и Lab цвета
      const { X, Y, Z } = rgbToXyz(...rgbColor.match(/\d+/g).map(Number));
      const { L, a, b } = xyzToLab(X, Y, Z);


      if (event.altKey || event.ctrlKey || event.shiftKey) {
        setColor2({
          rgb: rgbColor,
          xyz: { X, Y, Z },
          lab: { L, a, b },
          x,
          y,
        });
      } else {
        console.log('color1')
        setColor1({
          rgb: rgbColor,
          xyz: { X, Y, Z },
          lab: { L, a, b },
          x,
          y,
        });
      }
      console.log(color1);
    }
  };

  const handleCloseColorPanel = () => {
    setShowColorPanel(false);
  };

  const handleCanvasMouseMove = (event) => {

    if (activeTool === 'hand' && mouseDownPosition) { 
        const { x, y } = getPixelCoordinates(event);
  
        setCanvasPosition((prevPosition) => ({
          x: prevPosition.x + (x - mouseDownPosition.x) / 50,
          y: prevPosition.y + (y - mouseDownPosition.y) / 50,
        }));

        // Ограничение перемещения изображения
      const canvas = canvasRef.current;
      const maxLeft = -canvas.width * scale + 100;
      const maxRight = canvas.width * scale - 100;
      const maxTop = -canvas.height * scale + 100;
      const maxBottom = canvas.height * scale - 100;
      setCanvasPosition((prevPosition) => ({
        x: Math.max(maxLeft, Math.min(maxRight, prevPosition.x)),
        y: Math.max(maxTop, Math.min(maxBottom, prevPosition.y)),
      }));
      }

    if (activeTool === 'pipette') {
      const { x, y } = getPixelCoordinates(event);
      const rgbColor = getPixelColor(canvasRef.current.getContext('2d'), x, y);
      setColorValue(rgbColor);
      setCoordinatesValue(`(${Math.round(x)}, ${Math.round(y)})`);
    }
  };

  const handleCanvasMouseUp = () => {
    canvasBox.current.classList.remove('canvas-hand_grabbing');
    setMouseDownPosition(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;

        // Рассчитываем масштаб, чтобы изображение поместилось в canvas с отступами
        let calculatedScale = 1;

        canvas.width = originalWidth * calculatedScale;
        canvas.height = originalHeight * calculatedScale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setScale(calculatedScale);
        setImageSizeValue(`${originalWidth} x ${originalHeight}`);
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageSrc;
      img.onload = () => {
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  }, [scale, imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, canvasPosition.x, canvasPosition.y, canvas.width, canvas.height);
      };
      img.src = imageSrc;
    }
  }, [scale, imageSrc, canvasPosition]);

  // Функция для изменения размера изображения
  const resizeCanvas = (ctx, img, width, height, interpolationMethod) => {
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = width;
    resizedCanvas.height = height;
    const resizedCtx = resizedCanvas.getContext('2d');

    if (interpolationMethod === 'nearestNeighbor') {
      // Получаем исходные данные изображения
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const originalData = imageData.data;

      // Создаем ImageData для нового изображения
      const resizedImageData = resizedCtx.createImageData(width, height);
      const resizedData = resizedImageData.data;

      // Вычисляем коэффициенты масштабирования
      const xScale = img.width / width;
      const yScale = img.height / height;

      // Перебираем каждый пиксель нового изображения
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Определяем координаты исходного пикселя
          const srcX = Math.floor(x * xScale);
          const srcY = Math.floor(y * yScale);

          // Проверяем, чтобы координаты исходного пикселя находились в пределах изображения
          if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
            // Вычисляем индекс пикселя в исходном массиве данных
            const srcIndex = (srcY * img.width + srcX) * 4;

            // Копируем данные пикселя из исходного изображения
            resizedData[(y * width + x) * 4] = originalData[srcIndex];
            resizedData[(y * width + x) * 4 + 1] = originalData[srcIndex + 1];
            resizedData[(y * width + x) * 4 + 2] = originalData[srcIndex + 2];
            resizedData[(y * width + x) * 4 + 3] = originalData[srcIndex + 3];
          } else {
            // Если координаты выходят за границы, пиксель оставляем прозрачным
            resizedData[(y * width + x) * 4] = 0;
            resizedData[(y * width + x) * 4 + 1] = 0;
            resizedData[(y * width + x) * 4 + 2] = 0;
            resizedData[(y * width + x) * 4 + 3] = 0;
          }
        }
      }

      // Рисуем измененное изображение на холсте
      resizedCtx.putImageData(resizedImageData, 0, 0);
    } else {
      resizedCtx.drawImage(img, 0, 0, width, height);
    }

    return resizedCanvas;
  };

  return (
    <div>
        <div className='header'>
            <div className='loadBox'>
                <label class="input-file">
	   	            <input type="file" name="file" accept="image/" onChange={handleFileChange}  />		
	   	            <span>Выберите файл</span>
 	            </label>
                {/* <input type="file" /> */}
                <input type="text" placeholder="URL изображения" onChange={handleUrlChange} />
                <button onClick={() => setImageSrc(null)} className='headerBtn'>Очистить</button>
            </div>
            
            <div className="toolbar">
                <button
                className={`toolbar-button ${activeTool === 'hand' ? 'active' : ''}`}
                onClick={() => handleToolClick('hand')}
                title="Рука"
                >
                  <img src={grabIcon} alt='grab-icon'/>
                </button>
                <button
                className={`toolbar-button ${activeTool === 'pipette' ? 'active' : ''}`}
                onClick={() => handleToolClick('pipette')}
                title="Пипетка"
                >
                    <img src={pipetteIcon} alt='pippet-icon'/>
                </button>
            </div>
        </div> 
      

      
        <div>

            <div className='canvas-mainInfoBox'>
                <div className={`canvas-box ${activeTool === 'hand' ? 'canvas-hand' : activeTool === 'pipette' ? 'canvas-pipette' : ''}`} ref={canvasBox}>
                        <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseUp={handleCanvasMouseUp}
                        onKeyDown={handleKeyDown}
                        tabIndex={1000}  
                        />    
                </div>

                <div className="info-panel">
                    <p>Цвет: <span className='color-info'><span>{colorValue}</span> <span style={{display: 'inline-block' , width: 30, height:30, backgroundColor: colorValue}}></span></span></p>
                    <p>Координаты: <span>{coordinatesValue}</span></p>
                    <p>Размер изображения: <span>{imageSizeValue}</span></p>
                    <p>
                        Масштаб:
                    <input
                    type="range"
                    min="12"
                    max="300"
                    step="1"
                    value={scale * 100}
                    onChange={handleScaleChange}
                    />
                    </p>
                    <button onClick={() => setShowDialog(true)}>Изменить размер</button>
                    <button onClick={handleSaveImage}>Сохранить</button>
                </div>
            </div>
         
          

          {showColorPanel && (
            <div className="color-panel">
              <div className='panel-info'>
                <h3>Цвет 1:</h3>
                {color1 && (
                  <>
                    <div className="color-swatch" style={{ backgroundColor: color1.rgb }} />
                    <p>X: {Math.round(color1.x)}</p>
                    <p>Y: {Math.round(color1.y)}</p>
                    <p>RGB: {color1.rgb}</p>
                    <p>XYZ: ({color1.xyz.X.toFixed(2)}, {color1.xyz.Y.toFixed(2)}, {color1.xyz.Z.toFixed(2)})</p>
                    <p>Lab: ({color1.lab.L.toFixed(2)}, {color1.lab.a.toFixed(2)}, {color1.lab.b.toFixed(2)})</p>
                  </>
                )}
              </div>
              <div className='panel-info'>
                <h3>Цвет 2:</h3>
                {color2 && (
                  <>
                    <div className="color-swatch" style={{ backgroundColor: color2.rgb }} />
                    <p>X: {Math.round(color2.x)}</p>
                    <p>Y: {Math.round(color2.y)}</p>
                    <p>RGB: {color2.rgb}</p>
                    <p>XYZ: ({color2.xyz.X.toFixed(2)}, {color2.xyz.Y.toFixed(2)}, {color2.xyz.Z.toFixed(2)})</p>
                    <p>Lab: ({color2.lab.L.toFixed(2)}, {color2.lab.a.toFixed(2)}, {color2.lab.b.toFixed(2)})</p>
                  </>
                )}
              </div>
              <div className='color-result'>
                    <p className="contrast">
                        Контраст: {color1 && color2 && calculateContrast(color1.rgb, color2.rgb).toFixed(2)}
                        {color1 && color2 && calculateContrast(color1.rgb, color2.rgb) < 4.5 && (
                        <span className="contrast-low"> Недостаточный</span>
                        )}
                    </p>
                    <button onClick={handleCloseColorPanel}>Закрыть</button>
              </div>
            </div>
          )}
        </div>
      
        
      {showDialog && createPortal(
        <div className="dialog" onClick={() => setShowDialog(prev => !prev)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h2>Изменить размер</h2>
            <div className='dialog-elem'>
              <label htmlFor="resizeMode">Изменить в:</label>
              <select id="resizeMode" value={resizeMode} onChange={handleResizeModeChange}>
                <option value="percent">Проценты</option>
                <option value="pixel">Пиксели</option>
              </select>
            </div>
            <div className='dialog-elem'>
              <label htmlFor="resizeWidth">Ширина:</label>
              <input
                type="number"
                id="resizeWidth"
                value={resizeWidth}
                onChange={handleResizeWidthChange}
              />
              {resizeMode === 'percent' && <span>%</span>}
            </div>
            <div className='dialog-elem'>
              <label htmlFor="resizeHeight">Высота:</label>
              <input
                type="number"
                id="resizeHeight"
                value={resizeHeight}
                onChange={handleResizeHeightChange}
              />
              {resizeMode === 'percent' && <span>%</span>}
            </div>
            <div className='dialog-elem'>
              <input
                type="checkbox"
                id="maintainAspectRatio"
                checked={maintainAspectRatio}
                onChange={handleMaintainAspectRatioChange}
              />
              <label htmlFor="maintainAspectRatio">Сохранить пропорции</label>
            </div>
            <div className='dialog-elem'>
              <label htmlFor="interpolationMethod">Метод интерполяции:</label>
              <select
                id="interpolationMethod"
                value={interpolationMethod}
                onChange={handleInterpolationMethodChange}
              >
                <option value="nearestNeighbor">Ближайший сосед</option>
                {<option value="bilinear">Билинейная интерполяция</option> }
              </select>
              <span className="tooltip">
                Ближайший сосед: использует значения пикселей ближайших соседей.
              </span>
            </div>
            <button onClick={handleCloseDialog} className='dialig-btn'>Отмена</button>
            <button onClick={handleResize} className='dialig-btn'>Изменить</button>
          </div>
        </div>
      ,document.body)}
    </div>
  );
}

export default ImageUploader;