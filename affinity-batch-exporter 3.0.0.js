/**
 * name: Affinity Batch Exporter
 * description: Mengekspor semua file .af dalam satu folder memakai preset yang dipilih.
 * version: 3.0.0
 */

'use strict';

const APP_TITLE = 'Affinity Batch Exporter';
const LAST_PRESET_FILE = '.affinity-batch-exporter-last-preset.txt';

function normalizePath(path) {
    const normalized = path.replace(/\\/g, '/');
    return /^[a-z]:\/+$/i.test(normalized)
        ? normalized.slice(0, 3)
        : normalized.replace(/\/+$/, '');
}

function directoryOf(path) {
    const normalized = normalizePath(path);
    const lastSeparator = normalized.lastIndexOf('/');
    return lastSeparator === 2 && /^[a-z]:\//i.test(normalized)
        ? normalized.slice(0, 3)
        : normalized.slice(0, lastSeparator);
}

function fileNameOf(path) {
    const normalized = normalizePath(path);
    return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function joinPath(...parts) {
    const usableParts = parts.filter(Boolean);
    if (usableParts.length === 0) return '';
    const first = normalizePath(usableParts[0]).replace(/\/$/, '');
    const rest = usableParts.slice(1).map(part => normalizePath(part).replace(/^\/+/, ''));
    return [first, ...rest].join('/');
}

function isAffinityFile(path) {
    return /\.af$/i.test(path);
}

function normalizeFolderInput(value) {
    return normalizePath(value.trim().replace(/^"(.*)"$/, '$1'));
}

function normalizeExtension(extension) {
    return extension.trim().replace(/^\.+/, '').toLowerCase();
}

function extensionForPreset(presetName) {
    const specialFormats = [
        [/^JPEG XL\b/i, 'jxl'],
        [/^(JPEG 2000|JP2)\b/i, 'jp2'],
        [/^(JPEG|JPG)\b/i, 'jpg'],
        [/^(OpenEXR|EXR)\b/i, 'exr'],
        [/^(Radiance HDR|HDR)\b/i, 'hdr'],
        [/^(HEIF|HEIC)\b/i, 'heif'],
    ];
    const specialFormat = specialFormats.find(([pattern]) => pattern.test(presetName));
    if (specialFormat) return specialFormat[1];

    return presetName.match(/^([a-z0-9]{2,5})\b/i)?.[1].toLowerCase() ?? '';
}

function outputPathFor(path, extension, outputFolder = directoryOf(path), suffix = '', inputFolder = directoryOf(path), preserveSubfolders = false) {
    const inputDirectory = directoryOf(path);
    const relativeDirectory = preserveSubfolders
        ? inputDirectory.slice(normalizePath(inputFolder).length).replace(/^\/+/, '')
        : '';
    const outputName = fileNameOf(path).replace(/\.af$/i, `${suffix}.${normalizeExtension(extension)}`);
    return joinPath(outputFolder, relativeDirectory, outputName);
}

function matchesNameFilter(path, filter) {
    const query = filter.trim().toLowerCase();
    return !query || fileNameOf(path).toLowerCase().includes(query);
}

function isValidSuffix(suffix) {
    return !/[<>:"/\\|?*\x00-\x1f]/.test(suffix) && !/[. ]$/.test(suffix);
}

function reportTimestamp(date = new Date()) {
    const pad = (value, length = 2) => String(value).padStart(length, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        '-',
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
        pad(date.getMilliseconds(), 3),
    ].join('');
}

function errorMessage(error) {
    return error?.message ?? String(error);
}

function isPermissionDenied(error) {
    return /PERMISSION_DENIED/i.test(errorMessage(error));
}

function readLastPreset(File, FileSystemApi, folder) {
    const path = joinPath(folder, LAST_PRESET_FILE);
    try {
        return FileSystemApi.exists(path) ? File.readAll(path).toString().trim() : '';
    } catch (_) {
        return '';
    }
}

function writeTextFile(File, path, text) {
    const file = File.create(path, 'wb');
    try {
        file.writeString(text);
        file.flush();
    } finally {
        file.close();
    }
}

function chooseOptions(Dialog, DialogResult, inputFolder) {
    const dialog = Dialog.create('Opsi Batch Export');
    const group = dialog.addColumn().addGroup();
    const outputFolder = group.addTextBox('Folder output:', inputFolder);
    const nameFilter = group.addTextBox('Filter nama:', '');
    const suffix = group.addTextBox('Suffix nama:', '');
    const recursive = group.addCheckBox('Proses subfolder', false);
    const overwrite = group.addCheckBox('Timpa file yang sudah ada', false);
    dialog.initialWidth = 620;

    if (!dialog.runModal().equals(DialogResult.Ok)) return null;
    return {
        outputFolder: normalizeFolderInput(outputFolder.text),
        nameFilter: nameFilter.text.trim(),
        suffix: suffix.text,
        recursive: recursive.value,
        overwrite: overwrite.value,
    };
}

function choosePresets(Application, Dialog, DialogResult, presetNames, rememberedPreset) {
    const selected = [];
    let initialIndex = Math.max(0, presetNames.indexOf(rememberedPreset));

    while (true) {
        const dialog = Dialog.create(selected.length === 0 ? 'Pilih Preset Export' : 'Tambah Preset Export');
        const control = dialog.addColumn().addGroup().addComboBox('Preset:', presetNames, initialIndex);
        dialog.initialWidth = 520;
        if (!dialog.runModal().equals(DialogResult.Ok)) return selected.length > 0 ? selected : null;

        const name = presetNames[control.selectedIndex];
        const extensionInput = Application.prompt(
            `Konfirmasi ekstensi file untuk preset:\n${name}`,
            APP_TITLE,
            extensionForPreset(name),
        );
        if (!extensionInput) return selected.length > 0 ? selected : null;

        const extension = normalizeExtension(extensionInput);
        if (!/^[a-z0-9]{1,10}$/.test(extension)) {
            Application.alert('Ekstensi hanya boleh berisi 1 sampai 10 huruf atau angka.', APP_TITLE);
            continue;
        }
        if (selected.some(preset => preset.extension === extension)) {
            Application.alert(`Ekstensi .${extension} sudah dipakai. Pilih format lain agar hasil tidak saling menimpa.`, APP_TITLE);
            continue;
        }

        selected.push({ name, extension });
        initialIndex = control.selectedIndex;
        if (!Application.confirm('Tambahkan format export lain?', APP_TITLE)) return selected;
    }
}

function main() {
    const { Application } = require('/application.js');
    const { Dialog, DialogResult } = require('/dialog.js');
    const { Document, FileExportArea, FileExportOptions } = require('/document.js');
    const { Directory, File, FileSystemApi } = require('/fs.js');

    const currentDocument = Document.all.find(document => document.path);
    const initialFolder = currentDocument ? directoryOf(currentDocument.path) : '';
    const folderInput = Application.prompt(
        'Masukkan path folder yang berisi file .af:',
        APP_TITLE,
        initialFolder,
    );
    if (!folderInput) return;

    const inputFolder = normalizeFolderInput(folderInput);
    const options = chooseOptions(Dialog, DialogResult, inputFolder);
    if (!options) return;
    if (!isValidSuffix(options.suffix)) {
        Application.alert('Suffix mengandung karakter yang tidak valid untuk nama file.', APP_TITLE);
        return;
    }

    let inputFiles;
    try {
        if (!FileSystemApi.isDirectory(inputFolder)) {
            Application.alert('Folder sumber tidak ditemukan.', APP_TITLE);
            return;
        }
        if (!FileSystemApi.isDirectory(options.outputFolder)) {
            Application.alert('Folder output tidak ditemukan. Buat foldernya terlebih dahulu.', APP_TITLE);
            return;
        }

        const entries = new Directory(inputFolder).entries;
        inputFiles = (options.recursive ? entries.all.filePaths : entries.filePaths)
            .filter(isAffinityFile)
            .filter(path => matchesNameFilter(path, options.nameFilter))
            .toArray()
            .sort((left, right) => left.localeCompare(right));
    } catch (error) {
        if (!isPermissionDenied(error)) throw error;

        Application.alert(
            `Affinity menolak akses ke folder sumber atau output.\n\nBuka Settings > Scripting, aktifkan File System Access, lalu tambahkan kedua folder ke daftar folder yang diizinkan. Setelah itu jalankan script kembali.`,
            APP_TITLE,
        );
        return;
    }

    if (inputFiles.length === 0) {
        Application.alert('Tidak ada file .af yang cocok dengan folder dan filter.', APP_TITLE);
        return;
    }

    const presetNames = FileExportOptions.allPresetNames;
    if (presetNames.length === 0) {
        Application.alert('Affinity tidak menyediakan preset export.', APP_TITLE);
        return;
    }

    const presets = choosePresets(
        Application,
        Dialog,
        DialogResult,
        presetNames,
        readLastPreset(File, FileSystemApi, inputFolder),
    );
    if (!presets) return;

    const confirmed = Application.confirm(
        `Export ${inputFiles.length} file .af ke ${presets.length} format?\n\nPreset:\n${presets.map(preset => `- ${preset.name} (.${preset.extension})`).join('\n')}\n\nFolder output: ${options.outputFolder}\nSubfolder: ${options.recursive ? 'Ya' : 'Tidak'}\nFile lama: ${options.overwrite ? 'Ditimpa' : 'Dilewati'}\nFilter: ${options.nameFilter || '(semua)'}\nSuffix: ${options.suffix || '(tidak ada)'}`,
        APP_TITLE,
    );
    if (!confirmed) return;

    try {
        writeTextFile(File, joinPath(inputFolder, LAST_PRESET_FILE), presets[presets.length - 1].name);
    } catch (_) {
        // Export tetap dapat berjalan bila preferensi tidak bisa disimpan.
    }

    const configuredPresets = presets.map(preset => ({
        ...preset,
        exportOptions: FileExportOptions.createWithPresetName(preset.name),
    }));
    const exportArea = FileExportArea.createForWholeDocument();
    const openDocuments = new Map(
        Document.all
            .filter(document => document.path)
            .map(document => [normalizePath(document.path).toLowerCase(), document]),
    );
    const converted = [];
    const skipped = [];
    const failed = [];
    const reportRows = [];

    for (const inputPath of inputFiles) {
        const openDocument = openDocuments.get(normalizePath(inputPath).toLowerCase());
        let document = openDocument;
        let openedByConverter = false;

        try {
            if (!document) {
                document = Document.load(inputPath);
                openedByConverter = true;
            }

            for (const preset of configuredPresets) {
                const outputPath = outputPathFor(
                    inputPath,
                    preset.extension,
                    options.outputFolder,
                    options.suffix,
                    inputFolder,
                    options.recursive,
                );

                try {
                    const outputDirectory = directoryOf(outputPath);
                    if (!FileSystemApi.isDirectory(outputDirectory)) {
                        FileSystemApi.createDirectories(outputDirectory);
                    }
                    if (!options.overwrite && FileSystemApi.exists(outputPath)) {
                        skipped.push(outputPath);
                        reportRows.push(`[DILEWATI] ${inputPath} -> ${outputPath}`);
                        continue;
                    }

                    const exportRecords = document.export(outputPath, preset.exportOptions, exportArea).all;
                    const exportErrors = exportRecords.filter(record => !record.isSuccess);
                    if (exportErrors.length > 0) {
                        const messages = exportErrors.map(record => record.errorMessage).filter(Boolean);
                        throw new Error(messages.join('; ') || 'Affinity melaporkan export gagal.');
                    }
                    if (exportRecords.length === 0 && !FileSystemApi.exists(outputPath)) {
                        throw new Error('Affinity tidak membuat file hasil export.');
                    }

                    converted.push(outputPath);
                    reportRows.push(`[SUKSES] ${inputPath} -> ${outputPath} (${preset.name})`);
                } catch (error) {
                    const detail = `${fileNameOf(inputPath)} / ${preset.name}: ${errorMessage(error)}`;
                    failed.push(detail);
                    reportRows.push(`[GAGAL] ${detail}`);
                }
            }
        } catch (error) {
            for (const preset of configuredPresets) {
                const detail = `${fileNameOf(inputPath)} / ${preset.name}: ${errorMessage(error)}`;
                failed.push(detail);
                reportRows.push(`[GAGAL] ${detail}`);
            }
        } finally {
            if (openedByConverter && document) {
                try {
                    document.close();
                } catch (error) {
                    failed.push(`${fileNameOf(inputPath)}: gagal menutup dokumen (${errorMessage(error)})`);
                }
            }
        }
    }

    const reportPath = joinPath(
        options.outputFolder,
        `affinity-batch-export-report-${reportTimestamp()}.txt`,
    );
    let reportStatus = reportPath;
    try {
        writeTextFile(File, reportPath, [
            APP_TITLE,
            `Folder sumber: ${inputFolder}`,
            `Folder output: ${options.outputFolder}`,
            `Preset: ${presets.map(preset => preset.name).join(', ')}`,
            `Selesai: ${converted.length}`,
            `Dilewati: ${skipped.length}`,
            `Gagal: ${failed.length}`,
            '',
            ...reportRows,
        ].join('\n'));
    } catch (error) {
        reportStatus = `gagal dibuat (${errorMessage(error)})`;
    }

    const summary = [
        `Preset: ${presets.map(preset => preset.name).join(', ')}`,
        `Selesai: ${converted.length}`,
        `Dilewati: ${skipped.length}`,
        `Gagal: ${failed.length}`,
        `Laporan: ${reportStatus}`,
    ];
    if (failed.length > 0) summary.push('', failed.join('\n'));
    Application.alert(summary.join('\n'), APP_TITLE);
}

if (typeof process === 'undefined') {
    main();
}

module.exports = {
    directoryOf,
    extensionForPreset,
    fileNameOf,
    isAffinityFile,
    isPermissionDenied,
    isValidSuffix,
    joinPath,
    matchesNameFilter,
    normalizeExtension,
    normalizeFolderInput,
    normalizePath,
    outputPathFor,
    reportTimestamp,
};
