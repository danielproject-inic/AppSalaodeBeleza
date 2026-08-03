import os

def search_lumiere():
    search_terms = ["lumiere", "lumière"]
    for root, dirs, files in os.walk("."):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".git" in dirs:
            dirs.remove(".git")
        if "dist" in dirs:
            dirs.remove("dist")
            
        for name in dirs:
            if any(term in name.lower() for term in search_terms):
                print(f"FOLDER MATCH: {os.path.join(root, name)}")
        
        for name in files:
            if any(term in name.lower() for term in search_terms):
                print(f"FILE NAME MATCH: {os.path.join(root, name)}")
            
            filepath = os.path.join(root, name)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if any(term in content.lower() for term in search_terms):
                        print(f"CONTENT MATCH: {filepath}")
            except:
                pass

if __name__ == "__main__":
    search_lumiere()
