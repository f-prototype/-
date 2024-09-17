
import React, { useState, useEffect, useRef } from 'react';

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
  const canvasRef = useRef(null);

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

  const handleMaintainAspectRatioChange = (event) => {
    setMaintainAspectRatio(event.target.checked);
  };

  const handleInterpolationMethodChange = (event) => {
    setInterpolationMethod(event.target.value);
  };


  

  const handleResize = () => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const originalWidth = img.width;
        const originalHeight = img.height;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const originalPixels = originalWidth *  originalHeight;
        const resizedPixels = resizeWidth *  resizeHeight;
        const originalMegaPixels = (originalPixels / 1000000).toFixed(2);
        const resizedMegaPixels = (resizedPixels / 1000000).toFixed(2);

        if(!resizeWidth || !resizeHeight) {
          return
        }

        // Используйте nearestNeighbor для алгоритма ближайшего соседа
        const resizedImage = resizeCanvas(
          ctx,
          img,
          resizeWidth,
          resizeHeight,
          interpolationMethod === 'nearestNeighbor' ? 'nearestNeighbor' : 'bilinear'
        );

        canvas.width = resizedImage.width;
        canvas.height = resizedImage.height;
        ctx.drawImage(resizedImage, 0, 0);

        setImageSrc(resizedImage.toDataURL());
        setImageSizeValue(`${resizedImage.width} x ${resizedImage.height}`);
        setShowDialog(false);
      };

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;

        // Рассчитываем масштаб, чтобы изображение поместилось в canvas с отступами
        let calculatedScale = 1;

        const windowInnerWidth = document.documentElement.clientWidth;
        const windowInnerHeight = document.documentElement.clientHeight;
        const maxWidth = windowInnerWidth - 100;
        const maxHeight = windowInnerHeight - 100;
        if (originalWidth > maxWidth || originalHeight > maxHeight) {
          calculatedScale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
        }
        canvas.width = originalWidth *  calculatedScale;
        canvas.height = originalHeight *  calculatedScale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setScale(calculatedScale);
        setImageSizeValue(`${originalWidth} x ${originalHeight}`);

        canvas.addEventListener('mousemove', (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          const pixelData = ctx.getImageData(x, y, 1, 1).data;
          const rgbColor = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;

          setColorValue(rgbColor);
          setCoordinatesValue(`(${x}, ${y})`);
        });

        canvas.addEventListener('click', (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          const pixelData = ctx.getImageData(x, y, 1, 1).data;
          const rgbColor = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;

          setColorValue(rgbColor);
          setCoordinatesValue(`(${x}, ${y})`);
        });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * scale;
        canvas.height = img.height* scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = imageSrc;
    }
  }, [scale, imageSrc]);

  // Функция для изменения размера изображения
// Функция для изменения размера изображения с использованием алгоритма ближайшего соседа
// Функция для изменения размера изображения с использованием алгоритма ближайшего соседа
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
        const srcX = Math.round(x * xScale);
        const srcY = Math.round(y * yScale);

        // Проверяем, чтобы координаты исходного пикселя находились в пределах изображения
        if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
          // Вычисляем индекс пикселя в исходном массиве данных
          const srcIndex = (srcY * img.width + srcX) * 4;

          // Копируем данные пикселя из исходного изображения
          resizedData[(y * width + x) * 4] = originalData[srcIndex];
          resizedData[(y * width + x) * 4 + 1] = originalData[srcIndex + 1];
          resizedData[(y  * width + x) * 4 + 2] = originalData[srcIndex + 2];
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
      <input type="file" accept="image/" onChange={handleFileChange} />
      <input type="text" placeholder="URL изображения" onChange={handleUrlChange} />
      <button onClick={() => setImageSrc(null)}>Очистить</button>

      
        <div>
          <canvas ref={canvasRef}/>
          <div className="info-panel">
            <p>Цвет: <span>{colorValue}</span></p>
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
     

      {showDialog && (
        <div className="dialog">
          <div className="dialog-content">
            <h2>Изменить размер</h2>
            <div>
              <label htmlFor="resizeMode">Изменить в:</label>
              <select id="resizeMode" value={resizeMode} onChange={handleResizeModeChange}>
                <option value="percent">Проценты</option>
                <option value="pixel">Пиксели</option>
              </select>
            </div>
            <div>
              <label htmlFor="resizeWidth">Ширина:</label>
              <input
                type="number"
                id="resizeWidth"
                value={resizeWidth}
                onChange={handleResizeWidthChange}
                disabled={resizeMode === 'percent'}
                required
              />
              {resizeMode === 'percent' && <span>%</span>}
            </div>
            <div>
              <label htmlFor="resizeHeight">Высота:</label>
              <input
                type="number"
                id="resizeHeight"
                value={resizeHeight}
                onChange={handleResizeHeightChange}
                disabled={resizeMode === 'percent'}
                required
              />
              {resizeMode === 'percent' && <span>%</span>}
            </div>
            <div>
              <input
                type="checkbox"
                id="maintainAspectRatio"
                checked={maintainAspectRatio}
                onChange={handleMaintainAspectRatioChange}
              />
              <label htmlFor="maintainAspectRatio">Сохранить пропорции</label>
            </div>
            <div>
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
            <button onClick={handleCloseDialog}>Отмена</button>
            <button onClick={handleResize}>Изменить</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
