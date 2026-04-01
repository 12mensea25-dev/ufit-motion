import AppKit
import Foundation
import Vision

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data(message.utf8))
    exit(1)
}

guard CommandLine.arguments.count > 1 else {
    fail("Missing image path.")
}

let imagePath = CommandLine.arguments[1]
let imageUrl = URL(fileURLWithPath: imagePath)

guard let image = NSImage(contentsOf: imageUrl) else {
    fail("Unable to open image.")
}

var proposedRect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    fail("Unable to decode image.")
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .fast
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en_US"]
request.minimumTextHeight = 0.02

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

do {
    try handler.perform([request])
} catch {
    fail("OCR request failed: \(error.localizedDescription)")
}

let observations = (request.results ?? []).sorted {
    if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.02 {
        return $0.boundingBox.midY > $1.boundingBox.midY
    }
    return $0.boundingBox.minX < $1.boundingBox.minX
}

let lines = observations.compactMap { observation -> String? in
    observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines)
}.filter { !$0.isEmpty }

let payload: [String: Any] = [
    "text": lines.joined(separator: "\n"),
    "lines": lines
]

do {
    let data = try JSONSerialization.data(withJSONObject: payload, options: [])
    FileHandle.standardOutput.write(data)
} catch {
    fail("Unable to encode OCR response.")
}
