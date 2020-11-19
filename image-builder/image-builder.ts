type ImageStr = 'image';
type TextStr = 'text';
type BlockStr = 'block';
type LineStr = 'line';

type DownloadImageError = 'download_image_error'
type DrawCanvasError = 'draw_canvas_error'
type BuildImageError = 'build_image_error'
type VersionError = 'low_version_error'

interface Image {
    name: string;
    type: ImageStr;
    path: string;
    width: number;
    height: number;
    left: number;
    top: number;
    shape?: 'rect' | 'round';
    // raduis?: number;
    index: number;
}

interface Text {
    name: string;
    type: TextStr;
    text: string;
    color: string;
    fontSize: string;
    fontFamily: string;
    fontWeight?: number | string;
    left: number;
    top: number;
    index: number;
}

interface Block {
    name: string;
    type: BlockStr;
    left: number;
    top: number;
    width: number;
    height: number;
    color: string;
    // shape?: 'rect' | 'circle';
    // raduis?: number;
    index: number;
}

interface IData {
    canvasId: string;
    scale: number;
    path?: string; // 测试用的
    drawQueue: boolean[];
    canvas: any;
    ctx: any;
    drawOver: boolean;
}

type Material = Image | Text | Block;
type Materials = Array<Material>;

type errorType = DownloadImageError | BuildImageError | VersionError | DrawCanvasError

function bubbleSort(arr: Materials): Materials {
    const max = arr.length - 1;
    for (let j = 0; j < max; j++) {
        let done = true;
        for (let i = 0; i < max - j; i++) {
            if (arr[i].index > arr[i + 1].index) {
                const temp = arr[i];
                arr[i] = arr[i + 1];
                arr[i + 1] = temp;
                done = false;
            }
        }
        if (done) {
            break;
        }
    }
    return arr;
}

Component({
    /**
     * 组件的对外属性，是属性名到属性设置的映射表
     */
    properties: {
        canvasId: {
            type: String,
            value: '',
            observer(value: Materials) {
                if (value.length > 0) {
                    this.getSystemInfoScale();
                }
            },
        },
        width: {
            type: Number,
            value: 0
        },
        height: {
            type: Number,
            value: 0,
        },
        materials: {
            type: Array,
            value: [],
            observer(value: Materials) {
                if (value.length > 0) {
                    this.setMaterials(value);
                }
            },
        },
        startBuildImage: {
            type: Boolean,
            value: false,
            observer(value: Boolean) {
                if(value){
                    this.buildImage()
                }
            }
        }
    },

    /**
     * 组件的内部数据，和 properties 一同用于组件的模板渲染
     */
    data: <IData>{
        scale: 2,
        path: '',
        drawQueue: [] as boolean[],
        canvas: null,
        ctx: null,
        drawOver: false,
    },

    /**
     *  组件的方法，包括事件响应函数和任意的自定义方法，关于事件响应函数的使用
     */
    methods: {
        // 获取设备宽度
        getSystemInfoScale() {
            const scale = 750 / wx.getSystemInfoSync().windowWidth;
            this.data.scale = scale
        },
        handleError(type: errorType){
            this.triggerEvent('error', {
                type,
            });
            wx.$pandora.error({
                name: type,
                errorType: type,
                message: type
            });
        },
        /**
         * rpx 转 px
         * @param num
         * @returns {function(*): number}
         * @private
         */
        __rpx2px() {
            return (num: number): number => {
                return Math.floor((num / this.data.scale) * wx.getSystemInfoSync().pixelRatio);
            };
        },
        // 设置物料
        setMaterials(materials: Materials = []) {
            // 不去兼容低版本
            if (wx.$compareVersion('2.9.0') < 0) {
                this.handleError('low_version_error')
                return;
            }
            // 排序
            let layers = this.sortLayer(materials);
            // 绘制开始
            this.initCanvas(layers);
        },
        // 排序物料
        sortLayer(materials: Materials): Materials {
            // 不会存在物料数量过多的情况
            return bubbleSort(materials);
        },
        // 开始绘制
        initCanvas(layers: Materials = []) {
            const __rpx2px = this.__rpx2px();
            const query = wx
                .createSelectorQuery()
                .in(this)
                .select('#' + this.data.canvasId)
                .fields({ node: true, size: true })
                .exec(res => {
                    // 设置canvas
                    const canvas = res[0].node;
                    // 设置ctx
                    const ctx = canvas.getContext('2d', { alpha: false });

                    canvas.width = __rpx2px(this.data.width);
                    canvas.height = __rpx2px(this.data.height);

                    this.data.canvas = canvas;
                    this.data.ctx = ctx;

                    // 首次绘制
                    this.orderDraw(layers, 0);
                });
        },
        orderDraw(layers: Materials = [], index: number) {
            for (let i = index; i < layers.length; i++) {
                const item = layers[i];
                const index = i;
                switch (item.type) {
                    case 'image':
                        // 绘制图片时，等待图片加载完成后，按照顺序绘制
                        this.drawImageType(layers, index);
                        break;
                    case 'text':
                        this.drawText(item);
                        break;
                    case 'block':
                        this.drawRect(item);
                        break;
                }
                // 等待图片绘制完毕，开始下一次绘制
                if (item.type === 'image') break;
                if (index === layers.length - 1) this.drawSuccessCallBack()
            }
        },
        drawImageType(layers: Materials = [], index: number) {
            const item = layers[index] as Image;
            item.shape === 'round'
                ? this.drawRoundImage(layers, index)
                : this.drawImage(layers, index);
        },
        drawRoundImage(layers: Materials = [], index: number) {
            const canvas = this.data.canvas;
            const ctx = this.data.ctx;
            const __rpx2px = this.__rpx2px();

            const data = layers[index] as Image;

            const image = canvas.createImage();
            image.src = data.path;
            image.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(
                    __rpx2px(data.left + data.width / 2),
                    __rpx2px(data.top + data.width / 2),
                    __rpx2px(data.width / 2),
                    0,
                    2 * Math.PI,
                );
                ctx.clip();
                ctx.drawImage(
                    image,
                    __rpx2px(data.left),
                    __rpx2px(data.top),
                    __rpx2px(data.width),
                    __rpx2px(data.width),
                );
                ctx.restore();
                index === layers.length - 1
                    ? this.drawSuccessCallBack()
                    : this.orderDraw(layers, index + 1); // 图片绘制完毕，开启下一次绘制
            };
            image.onerror = () => this.handleError('download_image_error')
        },
        drawImage(layers: Materials = [], index: number) {
            const canvas = this.data.canvas;
            const ctx = this.data.ctx;
            const __rpx2px = this.__rpx2px();

            const data = layers[index] as Image;

            const image = canvas.createImage();
            image.src = data.path;
            image.onload = () => {
                ctx.drawImage(
                    image,
                    __rpx2px(data.left),
                    __rpx2px(data.top),
                    __rpx2px(data.width),
                    __rpx2px(data.height),
                );

                index === layers.length - 1
                    ? this.drawSuccessCallBack()
                    : this.orderDraw(layers, index + 1); // 图片绘制完毕，开启下一次绘制
            };
            image.onerror = () => this.handleError('download_image_error')
        },
        drawText(data: Text) {
            const ctx = this.data.ctx;
            const __rpx2px = this.__rpx2px();
            const font = {
                fontWeight: data.fontWeight,
                fontSize: __rpx2px(parseInt(data.fontSize)),
                fontFamily: data.fontFamily,
            };
            ctx.fillStyle = data.color;
            ctx.font = `${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;

            ctx.fillText(data.text, __rpx2px(data.left), __rpx2px(data.top));
        },
        drawRect(data: Block) {
            const ctx = this.data.ctx;
            const __rpx2px = this.__rpx2px();

            ctx.fillStyle = data.color;
            ctx.fillRect(
                __rpx2px(data.left),
                __rpx2px(data.top),
                __rpx2px(data.width),
                __rpx2px(data.height),
            );
        },
        drawSuccessCallBack() {
            this.data.drawOver = true;
            this.triggerEvent('drawCanvasCallback');
        },
        waitCanvasDrawSuccess() {
            let retryNumer = 0;
            return new Promise((resolve,reject) => {
                if (this.data.drawOver) {
                    resolve();
                } else {
                    // 如果日签没有生成完成，最多等待 0.5s
                    const retrTime = setInterval(() => {
                        retryNumer++;
                        if (this.data.drawOver) {
                            clearInterval(retrTime);
                            resolve();
                        }else if(retryNumer >= 10){
                            clearInterval(retrTime);
                            reject()
                        }
                    }, 50);
                }
            });
        },
        buildImage() {
            // 如果不在 canvas 绘制完成的回调中绘制图片，则需要保证 canvas 绘制完成
            this.waitCanvasDrawSuccess().then(()=>{
                wx.canvasToTempFilePath({
                    canvas: this.data.canvas,
                    fileType: 'jpg',
                    quality: 1,
                    success: res => {
                        this.buildImageCallBack(res.tempFilePath);
                    },
                    fail: () => this.handleError('build_image_error')
                },()=>this.handleError('draw_canvas_error'));
            })
        },
        buildImageCallBack(path: string) {
            this.triggerEvent('buildImageCallBack', { path });
        },
        bindClickCanvas(event: any) {
            this.triggerEvent('tap', event);
        }
    },
});
