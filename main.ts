import { App, Plugin, PluginSettingTab, Setting, TAbstractFile, View } from 'obsidian'

declare module "obsidian" {
	interface Vault {
		fileMap: {
			[name: string]: File
		}
	}

	interface WorkspaceLeaf {
		rebuildView: () => void
	}

	interface View {
		files?: any
		fileItems?: any
	}
}

type FileExplorerView = View & {
	files: any
	fileItems: any
	onModify: () => void
}

type Settings = {
	ignoredFiles: string
}

const DEFAULTS: Settings = {
	ignoredFiles: ''
}

function isFileExplorerView(view: View): view is FileExplorerView {
	return view.files && view.fileItems
}

export default class ObsidianIgnore extends Plugin {
	settings: Settings

	async onload() {
		await this.loadSettings()
		this.addSettingTab(new SettingTab(this.app, this))
		this.app.vault.on("create", this.processFile.bind(this))
	}

	onunload() {
		// TODO: Restore ignored files on unload
	}

	// TODO: Allow ignoring more than one file
	processFile(file: TAbstractFile) {
		if (file.name === this.settings.ignoredFiles) {
			this.removeIgnoredFile(file.name)
		}
	}

	removeIgnoredFile(name: string) {
		console.log(`Ignoring file: ${name}`)
		if (!this.app.vault.fileMap[name]) {
			console.warn(`Could not find file "${name}" to ignore`)
		} else {
			delete this.app.vault.fileMap[name]
			this.reloadFileExplorer()
		}
	}

	reloadFileExplorer() {
		this.app.workspace.iterateAllLeaves(l => {
			const view = l.view
			if (isFileExplorerView(view)) {
				console.log('Reloading file explorer')
				l.rebuildView()
			}
		})
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULTS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class SettingTab extends PluginSettingTab {
	plugin: ObsidianIgnore

	constructor(app: App, plugin: ObsidianIgnore) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		this.containerEl.empty()
		this.containerEl.createEl('h2', { text: 'Ignored File Settings' })

		new Setting(this.containerEl)
			.setName('Ignored files')
			.setDesc('File/folder names to ignore')
			.addText(text => text
				.setPlaceholder('someFolder,someFile.txt')
				.setValue(this.plugin.settings.ignoredFiles)
				.onChange(async (value) => {
					this.plugin.settings.ignoredFiles = value
					await this.plugin.saveSettings()
				})
			)
	}
}
