import jsfeat from 'jsfeat' // eslint-disable-line camelcase
import stackblur from 'stackblur'

class BackgroundRemover {
    constructor (image, settings) {
        this.image = image

        this.width = image.width
        this.height = image.height

        this.clip = settings.clip || {}

        this.threshold = 255 * (Math.max(0, Math.min(settings.threshold, 100)) / 100)
        this.blur = Math.max(0, Math.min(settings.blur, 20))

        this.transparent = {r: 0, g: 0, b: 0, a: 0}
    }

    work () {
        const edgeData = this.detectEdgesCanny()
        const imageData = this.removeBackground(edgeData || [])

        const image = this.getImageData()
        image.data.set(imageData)

        return image
    }

    getImageData () {
        return this.image
    }

    getPixelIndex (x, y) {
        return (y * this.width + x) * 4
    }

    getPixel (pixelArray, index) {
        return {
            r: pixelArray[index] || 0,
            g: pixelArray[index + 1] || 0,
            b: pixelArray[index + 2] || 0,
            a: pixelArray[index + 3] || 0,
        }
    }

    setPixel (pixelArray, index, rgba) {
        pixelArray[index] = rgba.r
        pixelArray[index + 1] = rgba.g
        pixelArray[index + 2] = rgba.b
        pixelArray[index + 3] = rgba.a
    }

    setPixelAlpha (pixelArray, index, alpha) {
        pixelArray[index + 3] = alpha
    }

    removeBackground (edgeData) {
        const imageData = new Uint8ClampedArray(this.image.data)
        const closed = []

        const x = this.clip.x || 0
        const y = this.clip.y || 0

        const colorPixel = this.getPixel(imageData, this.getPixelIndex(x, y))
        const queue = [
            {x, y},
            {x, y: this.height - 1},
            {x: this.width - 1, y},
            {x: this.width - 1, y: this.height - 1},
        ]

        this.processPixelsBFS(imageData, edgeData, colorPixel, queue, closed)

        return imageData
    }

    processPixelsBFS (imageData, edgeData, colorPixel, queue, closed) {
        while (queue.length > 0) {
            const {x, y, edge} = queue.pop()
            const index = this.getPixelIndex(x, y)

            if (closed[index] === true || x < 0 || x > this.width || y < 0 || y > this.height) continue

            const imagePixel = this.getPixel(imageData, index)
            const edgePixel = this.getPixel(edgeData, index)

            this.processPixel(imagePixel, edgePixel, index, x, y, edge, colorPixel, queue, imageData)
            closed[index] = true
        }
    }

    trasholdEqual (pixel, color) {
        const diff = Math.abs(pixel - color)
        return diff < this.threshold
    }

    isEdgePixelClear (pixel) {
        const diff = this.threshold / 4

        return pixel.r < diff && pixel.g < diff && pixel.b < diff
    }

    isOnTheEdge (pixel) {
        const diff = this.threshold / this.blur

        return pixel.r < diff && pixel.g < diff && pixel.b < diff
    }

    pixelEqual (imagePixel, edgePixel, colorPixel) {
        return (
            this.trasholdEqual(imagePixel.r, colorPixel.r) &&
            this.trasholdEqual(imagePixel.g, colorPixel.g) &&
            this.trasholdEqual(imagePixel.b, colorPixel.b) &&
            this.isOnTheEdge(edgePixel)
        )
    }

    countNewAlpha (edgePixel) {
        return (edgePixel.r + edgePixel.g + edgePixel.b) / 765
    }

    processPixel (imagePixel, edgePixel, index, x, y, edge, colorPixel, queue, imageData) {
        if (this.pixelEqual(imagePixel, edgePixel, colorPixel)) {
            if (this.isEdgePixelClear(edgePixel)) {
                this.setPixel(imageData, index, this.transparent)
            } else {
                this.setPixelAlpha(imageData, index, Math.max(0, 255 * this.countNewAlpha(edgePixel) - 127))
            }

            queue.push({x: x, y: y - 1})
            queue.push({x: x + 1, y: y})
            queue.push({x: x, y: y + 1})
            queue.push({x: x - 1, y: y})
        } else {
            this.setPixelAlpha(imageData, index, 127)
        }

    }

    detectEdgesCanny () {
        if (this.blur === 0) return

        const imageData = new Uint8ClampedArray(this.image.data)
        stackblur(imageData, this.width, this.height, 2)

        const imgU8 = this.createMatrix(imageData)

        jsfeat.imgproc.grayscale(imgU8, this.width, this.height, imgU8)
        jsfeat.imgproc.canny(imgU8, imgU8, this.threshold / 2,	this.threshold / 2)

        const dataU32 = new Uint32Array(imageData.buffer)
        const alpha = (0xff << 24)
        let i = imgU8.cols * imgU8.rows, pix = 0
        while (--i >= 0) {
            pix = imgU8.data[i]
            dataU32[i] = alpha | (pix << 16) | (pix << 8) | pix
        }

        stackblur(imageData, this.width, this.height, this.blur * 2)

        return imageData
    }

    createMatrix (data) {
        const matrix = new jsfeat.matrix_t(this.width, this.height, jsfeat.U8C1_t)

        for (let i = 0, l = data.length; i < l; i++) {
            matrix[i] = data[i]
        }

        return matrix
    }

    blurEdges (imageData) {
        const blurData = new Uint8ClampedArray(imageData)
        stackblur(blurData, this.width, this.height, 2)

        const src = imageData
        const dst = blurData

        for (let i = 0, l = blurData.length; i < l; i += 4) {
            const srcAlpha = src[i + 3] / 255
            const dstAlpha = dst[i + 3] / 255
            const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)

            blurData[i] *= 0.25
            blurData[i + 1] *= 0.25
            blurData[i + 2] *= 0.25

            blurData[i] = (src[i] * srcAlpha + dst[i] * dstAlpha * (1 - srcAlpha)) / outAlpha
            blurData[i + 1] = (src[i + 1] * srcAlpha + dst[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
            blurData[i + 2] = (src[i + 2] * srcAlpha + dst[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
            blurData[i + 3] = outAlpha * 255
        }

        return blurData
    }
}

export default function (data) {
    const worker = new BackgroundRemover(data.image, data.settings)
    const image = worker.work()

    return image
}
