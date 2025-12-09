import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

interface CameraInputProps {
    onCapture: (imageSrc: string) => void;
    label?: string;
}

export const CameraInput: React.FC<CameraInputProps> = ({ onCapture, label = "Take Photo" }) => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const image = webcamRef.current.getScreenshot();
            setImgSrc(image);
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
    };

    const confirm = () => {
        if (imgSrc) {
            onCapture(imgSrc);
            setIsCameraOpen(false);
        }
    };

    const cancel = () => {
        setImgSrc(null);
        setIsCameraOpen(false);
    };

    if (!isCameraOpen) {
        return (
            <div className="space-y-2">
                {imgSrc ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img src={imgSrc} alt="Captured" className="w-full h-48 object-cover" />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="absolute bottom-2 right-2"
                            onClick={() => setIsCameraOpen(true)}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retake
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-32 border-dashed flex flex-col gap-2"
                        onClick={() => setIsCameraOpen(true)}
                    >
                        <Camera className="h-8 w-8 text-gray-400" />
                        <span className="text-gray-500">{label}</span>
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                {!imgSrc ? (
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{ facingMode: "environment" }}
                    />
                ) : (
                    <img src={imgSrc} alt="Captured" className="w-full h-full object-contain" />
                )}
            </div>

            <div className="flex justify-between gap-2">
                {!imgSrc ? (
                    <>
                        <Button type="button" variant="outline" onClick={cancel} className="flex-1">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button type="button" onClick={capture} className="flex-1 bg-blue-600 hover:bg-blue-700">
                            <Camera className="h-4 w-4 mr-2" />
                            Capture
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="button" variant="outline" onClick={retake} className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retake
                        </Button>
                        <Button type="button" onClick={confirm} className="flex-1 bg-green-600 hover:bg-green-700">
                            <Check className="h-4 w-4 mr-2" />
                            Confirm
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
