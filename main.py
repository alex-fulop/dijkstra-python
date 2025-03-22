import tkinter as tk
from frontend.gui import PathfinderGUI

def main():
    root = tk.Tk()
    app = PathfinderGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
