import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import * as PDFJSViewer from 'pdfjs-dist/es5/web/pdf_viewer.js'
// import './Viewer.css';
// import 'pdfjs-dist/web/pdf_viewer.css';

interface Props {
    onInit: any
    onScaleChanged: any
}

interface State {
    scale: any
    doc: any
}

class Viewer extends Component<Props, State> {
    private _pdfViewer: any
    private _eventBus: PDFJSViewer.EventBus
    constructor(props) {
        super(props)
        this.initEventBus()
        this.state = {
            doc: null,
            scale: undefined,
        }
    }
    initEventBus() {
        const eventBus = new PDFJSViewer.EventBus()
        eventBus.on('pagesinit', (e) => {
            this.setState({
                scale: this._pdfViewer.currentScale,
            })
            if (this.props.onInit) {
                this.props.onInit({})
            }
            if (this.props.onScaleChanged) {
                this.props.onScaleChanged({ scale: this.state.scale })
            }
        })
        eventBus.on('scalechange', (e) => {
            if (this.props.onScaleChanged) {
                this.props.onScaleChanged({ scale: e.scale })
            }
        })
        this._eventBus = eventBus
    }
    componentDidMount() {
        const viewerContainer = ReactDOM.findDOMNode(this)
        this._pdfViewer = new PDFJSViewer.PDFViewer({
            container: viewerContainer,
            eventBus: this._eventBus,
        })
    }
    componentWillUpdate(nextProps, nextState) {
        if (this.state.doc !== nextState.doc) {
            this._pdfViewer.setDocument(nextState.doc)
        }
        if (this.state.scale !== nextState.scale) {
            this._pdfViewer.currentScale = nextState.scale
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        return (
            this.state.doc !== nextState.doc ||
            this.state.scale !== nextState.scale
        )
    }
    render() {
        return (
            <div
                style={{
                    position: 'absolute',
                    overflow: 'auto',
                    top: '0',
                    width: '100%',
                    height: '100%',
                }}
                className="Viewer"
            >
                <div>
                    <div id="viewer" className="pdfViewer viewer">
                        <div />
                    </div>
                </div>
            </div>
        )
    }
}

export default Viewer
