const fs = require("fs");
const path = require("path");
const https = require("https");

function strcmp(a, b) {
	if(a < b)
		return -1;
	else if(a > b)
		return 1;
	else
		return 0;
}

export default class ModManager {
	preload() {
		const request = new XMLHttpRequest();
		request.onload = () => {
			// Error handling is Coming Soon(TM)
			// Because this is very unreliable
			// This doesn't account for malformed JSON or where the request's loading time might exceed the game's
			this.modDatabase = JSON.parse(request.response);
		};
		request.open("GET", "https://raw.githubusercontent.com/CCDirectLink/CCModDB/master/npDatabase.json");
		request.send();
	}
	prestart() {
		const self = this;
		const currentLoadedMods = window.activeMods.concat(window.inactiveMods);
		const currentLoadedModNames = window.activeMods.concat(window.inactiveMods).map(mod => mod.name);

		ig.module("game.feature.menu.gui.mods.mod-list").requires(
			"impact.feature.gui.gui"
		).defines(function () {

			const icons = new ig.Font("media/font/CCModManagerIcons.png", 12, ig.MultiFont.ICON_START);
			let newFontIndex = sc.fontsystem.font.iconSets.length;
			sc.fontsystem.font.pushIconSet(icons);
			sc.fontsystem.font.setMapping({
				"mod-download": [newFontIndex, 0],
				"mod-config": [newFontIndex, 1],
				"mod-refresh": [newFontIndex, 2],
				"mod-delete": [newFontIndex, 3],
			});

			sc.ModListBox = ig.GuiElementBase.extend({
				gfx: new ig.Image("media/gui/menu.png"),
				mods: [],
				modEntries: [],
				buttonGroup: null,
				keyBinder: null,
				bg: null,
				entrySize: 0,
				list: null,
				listContent: null,
				init(mods) {
					this.parent();

					this.mods = mods;

					this.setSize(436, 258);
					this.setAlign(ig.GUI_ALIGN.X_CENTER, ig.GUI_ALIGN.Y_CENTER);

					this.hook.transitions = {
						DEFAULT: {
							state: {},
							time: 0.2,
							timeFunction: KEY_SPLINES.LINEAR
						},
						HIDDEN: {
							state: {
								alpha: 0,
								offsetX: 218
							},
							time: 0.2,
							timeFunction: KEY_SPLINES.LINEAR
						}
					};

					let menuPanel = new sc.MenuPanel;
					menuPanel.setSize(436, 258);
					this.addChildGui(menuPanel);

					this.bg = new sc.MenuScanLines;
					this.bg.setSize(436, 258);
					this.addChildGui(this.bg);

					let buttonSquareSize = 14;
					this.entrySize = (buttonSquareSize * 3) + 1;

					this.list = new sc.ButtonListBox(1, 0, this.entrySize);
					this.list.setSize(436, 258);
					this.buttonGroup = this.list.buttonGroup;
					this.addChildGui(this.list);
					
					this._createList();

					this.doStateTransition("HIDDEN", true);
				},

				_createList() {
					this.mods.forEach(mod => {	
						let newModEntry = new sc.ModListBox.Entry(mod.name, mod.description, mod.version, null, this);
						this.modEntries.push(newModEntry);
						this.list.addButton(newModEntry, false);
					});
				},

				addObservers() {
					sc.Model.addObserver(sc.menu, this);
				},

				removeObservers() {
					sc.Model.addObserver(sc.menu, this);
				},

				showMenu() {
					sc.menu.buttonInteract.pushButtonGroup(this.buttonGroup);
					this.keyBinder = new sc.KeyBinderGui;
					ig.gui.addGuiElement(this.keyBinder);
					sc.keyBinderGui = this.keyBinder;
					this.list.activate();
					this.doStateTransition("DEFAULT");
				},

				exitMenu() {
					sc.menu.buttonInteract.removeButtonGroup(this.buttonGroup);
					this.keyBinder.remove();
					sc.keyBinder = null;
					this.list.deactivate();
					this.doStateTransition("HIDDEN");
				},

				modelChanged() {

				},
			});

			sc.ModListBox.Entry = ig.FocusGui.extend({
				ninepatch: new ig.NinePatch("media/gui/CCModManager.png", {
					width: 42,
					height: 26,
					left: 1,
					top: 14,
					right: 1,
					bottom: 0,
					offsets: {
						default: {
							x: 0,
							y: 0
						},
						focus: {
							x: 0,
							y: 41
						}
					}
				}),
				nameText: null,
				description: null,
				versionText: null,
				bg: null,
				installRemoveButton: null,
				checkForUpdatesButton: null,
				openModSettingsButton: null,
				installRemoveCallback: null,
				checkForUpdateCallback: null,
				openModSettingsCallback: null,
				modList: null,
				highlight: null,
				modEntryActionButtonStart: {
					height: 14,
					ninepatch: new ig.NinePatch("media/gui/CCModManager.png", {
						left: 5,
						width: 8,
						right: 1,
						top: 11,
						height: 2,
						bottom: 1,
						offsets: {
							default: {
								x: 42,
								y: 82,
							},
							focus: {
								x: 56,
								y: 82,
							},
							pressed: {
								x: 56,
								y: 82,
							}
						}
					}),
					highlight: {
						startX: 70,
						endX: 84,
						leftWidth: 3,
						rightWidth: 1,
						offsetY: 82,
						gfx: new ig.Image("media/gui/CCModManager.png"),
						pattern: new ig.ImagePattern("media/gui/CCModManager.png", 74, 82, 9, 14)
					},
				},
				modEntryActionButtons: {
					height: 14,
					ninepatch: new ig.NinePatch("media/gui/CCModManager.png", {
						left: 1,
						width: 12,
						right: 1,
						top: 1,
						height: 12,
						bottom: 1,
						offsets: {
							default: {
								x: 0,
								y: 82
							},
							focus: {
								x: 14,
								y: 82
							},
							pressed: {
								x: 14,
								y: 82
							}
						}
					}),
					//*
					highlight: {
						startX: 28,
						endX: 42,
						leftWidth: 2,
						rightWidth: 2,
						offsetY: 82,
						gfx: new ig.Image("media/gui/CCModManager.png"),
						pattern: new ig.ImagePattern("media/gui/CCModManager.png", 30, 82, 10, 14, ig.ImagePattern.OPT.REPEAT_X)
					}
					//*/
				},
				init(name, description, version, icon, modList) {
					this.parent();
					let buttonSquareSize = 14;
					
					// 3 for the scrollbar
					this.setSize(modList.hook.size.x - 3, modList.entrySize);

					this.modList = modList;

					this.name = new sc.TextGui(name);

					this.description = new sc.TextGui(description, {
						font: sc.fontsystem.smallFont
					});

					this.name.setPos(4, 0);
					this.description.setPos(4, 14);

					this.versionText = new sc.TextGui(`v${version}`, {
						font: sc.fontsystem.tinyFont
					});

					this.versionText.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_TOP);
					this.versionText.setPos(3, 3);

					// TODO: Icon implementation
					this.icon = icon ? new Image(icon) : void 0;
					this.icon && this.addChildGui(this.icon);

					this.highlight = new sc.ModListBox.EntryHighlight(
						this.hook.size.x,
						this.hook.size.y,
						this.name.hook.size.x,
						buttonSquareSize * 3
					);
					this.highlight.setPos(0, 0);
					this.addChildGui(this.highlight);
					this.addChildGui(this.name);
					this.addChildGui(this.description);
					this.addChildGui(this.versionText);

					// See if there's an update available
					// Automatic update notifications Soon(TM)
					let mod = currentLoadedMods.find(mod => name === mod.name);
					let showDownloadButton = true;

					// Lexical comparison might work because it's greatest to least
					if(mod && mod.version >= version)
						showDownloadButton = false;

					//*
					this.installRemoveButton = new sc.ButtonGui(showDownloadButton ? "\\i[mod-download]" : "\\i[mod-delete]", buttonSquareSize-1, true, this.modEntryActionButtons);
					this.installRemoveButton.setPos(2, 1);
					this.installRemoveButton.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_BOTTOM);
					// There's some weird resizing with setText... but oh well.
					this.installRemoveButton.onButtonPress = function() {
						this.setText("\\i[mod-refresh]");

						// Remove existing mod if it even exists
						if(!showDownloadButton && mod) {
							const location = mod.baseDirectory;

							if(location.endsWith(".ccmod/")) {
								fs.rm(location);
							} else {
								fs.rmdir(location, {
									recursive: true
								});
							}

							// Dirty trick to "remove" the mod from view
							mod = null;
						} else {
							let link = null;

							// Find the ccmod download link, otherwise, it'll be handled Soon(TM).
							for(const download of self.modDatabase[name].installation)
								if(download.type === "ccmod")
									link = download.url;

							if(link !== null) {
								// Terrible terrible regex
								const filename = /.+\/(.+?\.ccmod)$/.exec(link)[1];
								// Should probably add proper error handling Soon(TM)
								fetch(link).then(res => res.arrayBuffer()).then(buffer => {
									const location = path.join("assets", "mods", filename);

									fs.writeFile(location, new Uint8Array(buffer), error => {
										if(error)
											console.error(error);
										else
											console.log("Successfully written file.");
									});

									// Dirty trick to "add" the mod to view
									mod = {baseDirectory: location + "/"};
								});
							}
						}

						showDownloadButton = !showDownloadButton
						this.setText(showDownloadButton ? "\\i[mod-download]" : "\\i[mod-delete]");
					};

					/*// "\\i[mod-refresh]"
					this.checkForUpdatesButton = new sc.ButtonGui("", buttonSquareSize-1, true, this.modEntryActionButtons);
					this.checkForUpdatesButton.setPos(this.installRemoveButton.hook.pos.x + this.installRemoveButton.hook.size.x + 1, 1);
					this.checkForUpdatesButton.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_BOTTOM);
					//this.checkForUpdatesButton.onButtonPress = () => console.log("do something?");

					// "\\i[mod-config]"
					this.openModSettingsButton = new sc.ButtonGui("", buttonSquareSize-1, true, this.modEntryActionButtonStart);
					this.openModSettingsButton.setPos(this.checkForUpdatesButton.hook.pos.x + this.checkForUpdatesButton.hook.size.x + 1, 1);
					this.openModSettingsButton.setAlign(ig.GUI_ALIGN.X_RIGHT, ig.GUI_ALIGN.Y_BOTTOM);
					//this.openModSettingsButton.onButtonPress = () => console.log("do something?");*/

					[this.installRemoveButton, /*this.checkForUpdatesButton, this.openModSettingsButton*/].forEach(button => {
						this.addChildGui(button);
						this.modList.buttonGroup.addFocusGui(button);
						button.focusGained = function() {
							this.focus = true;
							this.hook.parentHook.gui.focusGained();
						}.bind(button);
						button.focusLost = function() {
							this.focus = false;
							this.hook.parentHook.gui.focusLost();
						}.bind(button);
						button.textChild.setPos(1, 3);
					});
					//*/
				},

				updateDrawables(root) {
					if (this.modList.hook.currentStateName != "HIDDEN") {
						this.ninepatch.draw(root, this.hook.size.x, this.hook.size.y, this.focus ? "focus" : "default");
					}
				},

				focusGained() {
					this.parent();
					this.highlight.focus = this.focus;
				},

				focusLost() {
					this.parent();
					this.highlight.focus = this.focus;
				}
			});

			ninepatch: new ig.NinePatch("media/gui/CCModManager.png", {
				left: 3,
				width: 38,
				right: 0,
				top: 14,
				height: 24,
				bottom: 3,
				offsets: {
					default: {
						x: 44,
						y: 0
					},
					focus: {
						x: 44,
						y: 41
					}
				}
			}),

			sc.ModListBox.EntryHighlight = ig.GuiElementBase.extend({
				gfx: new ig.Image("media/gui/CCModManager.png"),
				ninepatch: new ig.NinePatch("media/gui/CCModManager.png", {
					left: 3,
					width: 38,
					right: 0,
					top: 14,
					height: 24,
					bottom: 3,
					offsets: {
						default: {
							x: 44,
							y: 0
						},
						focus: {
							x: 44,
							y: 41
						}
					}
				}),
				buttonCover: new ig.NinePatch("media/gui/CCModManager.png", {
					left: 4,
					width: 30,
					right: 1,
					top: 14,
					height: 9,
					bottom: 18,
					offsets: {
						default: {
							x: 51,
							y: 96
						},
						focus: {
							x: 7,
							y: 96,
						}
					}
				}),
				textWidth: null,
				buttonWidth: null,
				highLightOffsetY: 41,

				textTag: new ig.ImagePattern("media/gui/CCModManager.png", 91, 3, 18, 13, ig.ImagePattern.OPT.REPEAT_X),
				textTagHighlighted: new ig.ImagePattern("media/gui/CCModManager.png", 91, 44, 18, 13, ig.ImagePattern.OPT.REPEAT_X),
				focus: false,
				
				init(width, height, textWidth, buttonWidth) {
					this.parent();
					this.setSize(width, height);
					this.textWidth = textWidth;
					this.buttonWidth = buttonWidth;
				},

				updateDrawables(src) {
					this.ninepatch.draw(
						src,
						this.hook.size.x - this.buttonWidth - 6,
						this.hook.size.y + 1,
						this.focus ? "focus" : "default"
					);

					this.buttonCover.draw(
						src,
						this.buttonWidth + 4,
						this.hook.size.y + 1,
						this.focus ? "focus" : "default",
						this.hook.size.x - this.buttonWidth - 6
					);
					
					src.addPattern(
						this.focus ? this.textTagHighlighted : this.textTag,
						3,
						3,
						90,
						0,
						this.textWidth,
						13,
					);

					src.addGfx(
						this.gfx,
						this.textWidth + 3,
						3,
						109,
						this.focus ? 44 : 3,
						6,
						13
					);
				}
			});
		});

		ig.module("game.feature.menu.gui.mods.mod-menu")
			.requires(
				"impact.feature.gui.gui",
				"game.feature.menu.gui.base-menu"
			).defines(function () {
				sc.ModMenu = sc.BaseMenu.extend({
					modList: null,
					init() {
						this.parent();
						this.hook.size.x = ig.system.width;
						this.hook.size.y = ig.system.height;

						const modList = [];
						for(const mod of Object.values(self.modDatabase)) {
							const {name, description, version} = mod.metadata;
							modList.push({name, description, version});
						}
						this.modList = new sc.ModListBox(modList);
						this.addChildGui(this.modList);

						this.doStateTransition("DEFAULT", true);
					},

					showMenu() {
						this.addObservers();
						sc.menu.pushBackCallback(this.onBackButtonPress.bind(this));
						sc.menu.moveLeaSprite(0, 0, sc.MENU_LEA_STATE.HIDDEN);
						this.modList.showMenu();
					},

					hideMenu() {
						this.removeObservers();
						sc.menu.moveLeaSprite(0, 0, sc.MENU_LEA_STATE.LARGE);
						this.exitMenu();
					},

					exitMenu() {
						this.modList.exitMenu();
					},

					addObservers() {
						sc.Model.addObserver(sc.menu, this);
						this.modList.addObservers();
					},

					removeObservers() {
						sc.Model.removeObserver(sc.menu, this);
						this.modList.removeObservers();
					},

					onBackButtonPress() {
						sc.menu.popBackCallback();
						sc.menu.popMenu();
					},

					modelChanged(sender, event, data) {

					}
				});
			});

		sc.MENU_SUBMENU["MODS"] = Math.max(...Object.values(sc.MENU_SUBMENU)) + 1;

		sc.SUB_MENU_INFO[sc.MENU_SUBMENU.MODS] = {
			Clazz: sc.ModMenu,
			name: "mods"
		}

		sc.TitleScreenButtonGui.inject({
			modsButton: null,
			init() {
				this.parent();

				let optionsButtonY = this.buttons[1].hook.pos.y;

				this.buttons.slice(1).forEach(button => {
					button.setPos(button.hook.pos.x, button.hook.pos.y + 28); // 28, button height + padding
				});

				this.modsButton = this._createButton("mods", optionsButtonY, 6, function () {
					this._enterModsMenu();
				}.bind(this), "mods");

				this.doStateTransition("DEFAULT", true);
			},

			_enterModsMenu() {
				sc.menu.setDirectMode(true, sc.MENU_SUBMENU.MODS);
				sc.model.enterMenu(true);
			}
		});
	}
}