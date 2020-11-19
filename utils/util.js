// 职责链
class Chain {
    constructor(fn) {
        this.fn = fn;
        this.successor = null;
    }

    setNextSuccessor(successor) {
        return (this.successor = successor);
    }

    async passRequest(...args) {
        const result = await this.fn(...args);

        if (result === 'nextSuccessor') {
            return this.successor && this.successor.passRequest(...args);
        }

        return result;
    }
}
// 定时任务队列
class Pong {
    constructor(fn) {
        this.timedTasks = [];
        this.timedNumbers = 0;
    }
    openPong() {
        // 记录心跳次数，以支持倍数执行
        setInterval(() => {
            this.timedTasks.forEach(item => {
                this.timedNumbers++;
                if (item.active && this.timedNumbers % item.time === 0) {
                    item.func();
                }
            });
        }, 1000);
    }
    // name 用于该任务的标识，desc 用于 log 的打印
    addTimedTask({ name = '', desc = '', time = 1, active = true, func = () => {} }) {
        // 添加时立即执行，然后跟随下一次心跳
        if (active) func();
        const timedTasksNames = [];
        this.timedTasks.forEach(item => {
            timedTasksNames.push(item.name);
        });
        if (!timedTasksNames.includes(name)) {
            this.timedTasks.push({ name, desc, time, active, func });
        }
    }
    // 沉默某个定时任务
    hushTimedTask(name) {
        this.timedTasks.map(item => {
            if (item.name === name) {
                item.active = false;
                return item;
            }
        });
    }
}
// 小程序 canvas 加载图片
class CanvasHelper {
    canvasImagesLoaded(canvas, photoPaths) {
        const photoLoad = [];
        photoPaths.forEach(item => {
            photoLoad.push(imageLoaded(canvas, item));
        });
        return Promise.all(photoLoad);
    }
    
    imageLoaded(canvas, photoPath) {
        const image = canvas.createImage();
        image.src = photoPath;
        return new Promise((resolve, reject) => {
            image.onload = () => {
                resolve(image);
            };
            image.onerror = () => {
                reject();
            };
        });
    }
}