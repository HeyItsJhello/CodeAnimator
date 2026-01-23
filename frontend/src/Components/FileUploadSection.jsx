import { motion, AnimatePresence } from "framer-motion";

function FileUploadSection({ fileName, totalLines, onFileUpload }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h2>1. Upload Code File</h2>
      <div className="file-upload-wrapper">
        <input
          type="file"
          id="file-upload"
          accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.go,.rs,.rb,.php,.swift,.kt,.gd"
          onChange={onFileUpload}
          required
        />
        <label htmlFor="file-upload" className="file-upload-label">
          {fileName || "Choose a file..."}
        </label>
      </div>
      <AnimatePresence>
        {totalLines > 0 && (
          <motion.p
            className="file-info"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            File loaded: {totalLines} lines total
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FileUploadSection;
