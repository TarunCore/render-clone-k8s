from flask import Flask, send_file, render_template_string, render_template

app = Flask(__name__)

# Root endpoint
@app.route('/')
def home():
    return "Hello"

# HTML endpoint
@app.route('/html')
def html():
    return render_template('main.html')

# Image endpoint
@app.route('/image')
def image():
    # Make sure 'sample.jpg' exists in the same directory
    return send_file("k8s.png", mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True, port=5000, host="0.0.0.0")
